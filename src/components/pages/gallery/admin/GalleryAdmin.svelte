<script lang="ts">
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@/components/common/Icon.svelte";
import { galleryConfig } from "@/config/galleryConfig";
import { url } from "@/utils/url-utils";
import type { GalleryIndexDto, UploadTokenDto } from "../types";
import AlbumForm from "./AlbumForm.svelte";
import ConfirmDialog from "./ConfirmDialog.svelte";
import LoginCard from "./LoginCard.svelte";
import PhotoGrid from "./PhotoGrid.svelte";
import type { AdminPhoto, AlbumDraft } from "./types";
import UploadZone from "./UploadZone.svelte";

const TOKEN_KEY = "gallery-admin-token";

type ToastKind = "success" | "error" | "info";
type UploadStatus = "queued" | "uploading" | "success" | "error";

interface AdminAlbum {
	id: string;
	name: string;
	description?: string;
	date?: string;
	location?: string;
	tags?: string[];
	cover?: string;
	dynamic: boolean;
	photos: AdminPhoto[];
}

interface UploadItem {
	id: number;
	name: string;
	status: UploadStatus;
	progress: number;
	error?: string;
}

interface ConfirmState {
	title: string;
	message: string;
	confirmText: string;
	danger: boolean;
	busy: boolean;
	run: () => Promise<void>;
}

class ApiError extends Error {
	status: number;
	code: string;
	constructor(code: string, status: number, message?: string) {
		super(message || code);
		this.code = code;
		this.status = status;
	}
}

let token = $state<string | null>(
	typeof window !== "undefined" ? sessionStorage.getItem(TOKEN_KEY) : null,
);
let checking = $state(true);
let authed = $state(false);
let loading = $state(false);
let cdnBase = $state("");
let dynamicAlbums = $state<AdminAlbum[]>([]);
let selectedAlbumId = $state("");
let createOpen = $state(false);
let editingAlbum = $state<AdminAlbum | null>(null);
let toasts = $state<Array<{ id: number; kind: ToastKind; text: string }>>([]);
let confirmState = $state<ConfirmState | null>(null);
let uploads = $state<UploadItem[]>([]);

let toastSeq = 0;
let uploadSeq = 0;

const staticAlbums: AdminAlbum[] = galleryConfig.albums.map((a) => ({
	...a,
	dynamic: false,
	photos: [],
}));

const albums = $derived.by(() => {
	const list: AdminAlbum[] = [...staticAlbums];
	for (const d of dynamicAlbums) {
		const idx = list.findIndex((a) => a.id === d.id);
		if (idx >= 0) list[idx] = d;
		else list.push(d);
	}
	return list;
});

const selectedAlbum = $derived(
	albums.find((a) => a.id === selectedAlbumId) || null,
);
const uploading = $derived(uploads.some((u) => u.status === "uploading"));

function toast(kind: ToastKind, text: string) {
	const id = ++toastSeq;
	toasts = [...toasts, { id, kind, text }];
	setTimeout(() => {
		toasts = toasts.filter((t) => t.id !== id);
	}, 3500);
}

async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		...(init.headers as Record<string, string> | undefined),
	};
	if (token) headers.Authorization = `Bearer ${token}`;
	const res = await fetch(path, { ...init, headers });
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new ApiError(data?.error || "error", res.status, data?.message);
	}
	return data;
}

async function loadIndex() {
	loading = true;
	try {
		const data = await api<GalleryIndexDto>("/api/gallery/index");
		cdnBase = data.cdnBase || "";
		dynamicAlbums = (data.albums || []).map((a) => ({
			id: a.id,
			name: a.name,
			description: a.description,
			date: a.date,
			location: a.location,
			tags: a.tags,
			cover: a.cover,
			dynamic: a.dynamic === true,
			photos: (a.photos || []).map((p) => ({
				path: p.path,
				url: `${cdnBase}${p.path}`,
				size: p.size,
				uploadedAt: p.uploadedAt,
			})),
		}));
		if (!selectedAlbumId && dynamicAlbums.length > 0) {
			selectedAlbumId = dynamicAlbums[0].id;
		}
	} catch (e) {
		toast("error", i18n(I18nKey.galleryLoadError));
		console.error("loadIndex failed:", e);
	} finally {
		loading = false;
	}
}

async function verify(password: string): Promise<boolean> {
	try {
		const res = await fetch("/api/gallery/verify", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${password}`,
			},
			body: JSON.stringify({}),
		});
		if (!res.ok) return false;
		token = password;
		sessionStorage.setItem(TOKEN_KEY, password);
		return true;
	} catch {
		return false;
	}
}

$effect(() => {
	if (!token) {
		checking = false;
		return;
	}
	let cancelled = false;
	api("/api/gallery/verify", { method: "POST", body: JSON.stringify({}) })
		.then(() => {
			if (!cancelled) {
				authed = true;
				return loadIndex();
			}
		})
		.catch(() => {
			if (!cancelled) {
				token = null;
				sessionStorage.removeItem(TOKEN_KEY);
			}
		})
		.finally(() => {
			if (!cancelled) checking = false;
		});
	return () => {
		cancelled = true;
	};
});

function logout() {
	token = null;
	sessionStorage.removeItem(TOKEN_KEY);
	authed = false;
	selectedAlbumId = "";
	dynamicAlbums = [];
}

function xhrUpload(
	urlStr: string,
	form: FormData,
	onProgress: (ratio: number) => void,
): Promise<unknown> {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", urlStr);
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) onProgress(e.loaded / e.total);
		};
		xhr.onload = () => {
			if (xhr.status >= 200 && xhr.status < 300) {
				try {
					const data = JSON.parse(xhr.responseText);
					if (data && typeof data.code === "number" && data.code !== 200) {
						reject(new Error(`upyun code ${data.code}`));
					} else {
						resolve(data);
					}
				} catch {
					resolve(null);
				}
			} else {
				reject(new Error(`HTTP ${xhr.status}`));
			}
		};
		xhr.onerror = () => reject(new Error("network error"));
		xhr.send(form);
	});
}

function updateUpload(id: number, patch: Partial<UploadItem>) {
	uploads = uploads.map((u) => (u.id === id ? { ...u, ...patch } : u));
}

async function handleFiles(files: File[]) {
	if (!selectedAlbumId) {
		toast("error", i18n(I18nKey.galleryAdminSelectAlbum));
		return;
	}
	const albumId = selectedAlbumId;
	const items: UploadItem[] = files.map((f) => ({
		id: ++uploadSeq,
		name: f.name,
		status: "queued",
		progress: 0,
	}));
	uploads = [...uploads, ...items];

	for (let i = 0; i < files.length; i++) {
		const file = files[i];
		const item = items[i];
		updateUpload(item.id, { status: "uploading", progress: 0 });
		try {
			const tok = await api<UploadTokenDto>("/api/gallery/upload-token", {
				method: "POST",
				body: JSON.stringify({ albumId, filename: file.name }),
			});
			const form = new FormData();
			form.append("policy", tok.policy);
			form.append("signature", tok.signature);
			form.append("file", file);
			await xhrUpload(tok.uploadUrl, form, (p) =>
				updateUpload(item.id, { progress: p }),
			);
			await api("/api/gallery/complete", {
				method: "POST",
				body: JSON.stringify({ albumId, path: tok.path, size: file.size }),
			});
			updateUpload(item.id, { status: "success", progress: 1 });
		} catch (e) {
			updateUpload(item.id, {
				status: "error",
				error: e instanceof Error ? e.message : String(e),
			});
			toast("error", `${i18n(I18nKey.galleryAdminUploadFail)}: ${item.name}`);
		}
	}

	await loadIndex();
	if (!items.some((i) => i.status === "error")) {
		toast("success", i18n(I18nKey.galleryAdminUploadSuccess));
	}
	// 短暂保留成功项后清理
	setTimeout(() => {
		const ids = new Set(
			items.filter((i) => i.status === "success").map((i) => i.id),
		);
		if (ids.size > 0) uploads = uploads.filter((u) => !ids.has(u.id));
	}, 4000);
}

async function handleCreateAlbum(draft: AlbumDraft) {
	try {
		await api("/api/gallery/album", {
			method: "POST",
			body: JSON.stringify(draft),
		});
		createOpen = false;
		selectedAlbumId = draft.id;
		await loadIndex();
		toast("success", i18n(I18nKey.galleryAdminCreateSuccess));
	} catch (e) {
		if (e instanceof ApiError && e.code === "album_exists") {
			throw new Error(i18n(I18nKey.galleryAdminAlbumExists));
		}
		throw e;
	}
}

async function handleUpdateAlbum(draft: AlbumDraft) {
	try {
		await api("/api/gallery/album/rename", {
			method: "POST",
			body: JSON.stringify(draft),
		});
		editingAlbum = null;
		await loadIndex();
		toast("success", i18n(I18nKey.galleryAdminSaveSuccess));
	} catch (e) {
		throw e;
	}
}

function requestDeletePhoto(photo: AdminPhoto) {
	const albumId = selectedAlbumId;
	confirmState = {
		title: i18n(I18nKey.galleryAdminDelete),
		message: i18n(I18nKey.galleryAdminDeleteConfirm),
		confirmText: i18n(I18nKey.galleryAdminDelete),
		danger: true,
		busy: false,
		run: async () => {
			await api("/api/gallery/delete", {
				method: "POST",
				body: JSON.stringify({ albumId, path: photo.path }),
			});
			await loadIndex();
		},
	};
}

function requestDeleteAlbum() {
	const album = selectedAlbum;
	if (!album?.dynamic) return;
	confirmState = {
		title: i18n(I18nKey.galleryAdminDeleteAlbum),
		message: i18n(I18nKey.galleryAdminDeleteAlbumConfirm),
		confirmText: i18n(I18nKey.galleryAdminDeleteAlbum),
		danger: true,
		busy: false,
		run: async () => {
			await api(`/api/gallery/album?id=${encodeURIComponent(album.id)}`, {
				method: "DELETE",
			});
			selectedAlbumId = "";
			await loadIndex();
		},
	};
}

async function runConfirm() {
	const state = confirmState;
	if (!state) return;
	confirmState = { ...state, busy: true };
	try {
		await state.run();
		confirmState = null;
		toast("success", i18n(I18nKey.galleryAdminDone));
	} catch (e) {
		confirmState = { ...state, busy: false };
		toast("error", i18n(I18nKey.galleryAdminUploadFail));
		console.error(e);
	}
}

async function setCover(photo: AdminPhoto) {
	try {
		await api("/api/gallery/album/cover", {
			method: "POST",
			body: JSON.stringify({ albumId: selectedAlbumId, path: photo.path }),
		});
		await loadIndex();
		toast("success", i18n(I18nKey.galleryAdminSetCover));
	} catch (e) {
		toast("error", i18n(I18nKey.galleryAdminUploadFail));
		console.error(e);
	}
}

async function copyLink(photo: AdminPhoto) {
	try {
		await navigator.clipboard.writeText(photo.url);
		toast("success", i18n(I18nKey.galleryAdminCopied));
	} catch {
		toast("error", i18n(I18nKey.galleryAdminUploadFail));
	}
}
</script>

{#if checking}
	<div class="admin-loading">
		<Icon name="svg-spinners:ring-resize" size="sm" />
		<span>{i18n(I18nKey.galleryAdminLoading)}</span>
	</div>
{:else if !authed}
	<LoginCard onVerify={verify} />
{:else}
	<div class="admin-app">
		<header class="admin-header">
			<div class="admin-header__left">
				<a class="admin-btn" href={url("/gallery/")}>
					<Icon name="material-symbols:arrow-back" size="sm" />
					{i18n(I18nKey.galleryAdminBackToGallery)}
				</a>
				<h1 class="admin-header__title">{i18n(I18nKey.galleryAdmin)}</h1>
			</div>
			<div class="admin-header__actions">
				<button class="admin-btn" onclick={loadIndex} disabled={loading}>
					<Icon name="material-symbols:refresh-rounded" size="sm" />
					{i18n(I18nKey.galleryAdminRefresh)}
				</button>
				<button class="admin-btn" onclick={logout}>
					<Icon name="material-symbols:logout-rounded" size="sm" />
					{i18n(I18nKey.galleryAdminLogout)}
				</button>
			</div>
		</header>

		<div class="admin-body">
			<aside class="admin-sidebar">
				<div class="admin-panel">
					<label style="font-size:0.8125rem;font-weight:600;display:block;margin-bottom:0.5rem;">
						{i18n(I18nKey.galleryAdminSelectAlbum)}
					</label>
					<select class="admin-select" bind:value={selectedAlbumId}>
						<option value="" disabled>
							{i18n(I18nKey.galleryAdminSelectAlbum)}
						</option>
						{#each albums as album (album.id)}
							<option value={album.id}>
								{album.name}{album.dynamic ? "" : " · 本地"}
							</option>
						{/each}
					</select>

					{#if selectedAlbum}
						<div class="admin-sidebar__stats">
							<div style="margin-top:0.9rem;">
								{selectedAlbum.photos.length} {i18n(I18nKey.galleryPhotos)}
							</div>
							{#if selectedAlbum.date}
								<div>{selectedAlbum.date}</div>
							{/if}
							{#if selectedAlbum.location}
								<div>{selectedAlbum.location}</div>
							{/if}
							{#if selectedAlbum.tags && selectedAlbum.tags.length > 0}
								<div class="admin-sidebar__tags">
									{#each selectedAlbum.tags as tag (tag)}
										<span class="admin-sidebar__tag">{tag}</span>
									{/each}
								</div>
							{/if}
						</div>
					{/if}
				</div>

				<button class="admin-btn admin-btn--primary" onclick={() => (createOpen = !createOpen)}>
					<Icon name="material-symbols:add-rounded" size="sm" />
					{i18n(I18nKey.galleryAdminCreateAlbum)}
				</button>

				{#if selectedAlbum?.dynamic}
					<button class="admin-btn" onclick={() => { createOpen = false; editingAlbum = selectedAlbum; }}>
						<Icon name="material-symbols:edit-square-outline" size="sm" />
						{i18n(I18nKey.galleryAdminEditAlbum)}
					</button>
					<button class="admin-btn admin-btn--danger" onclick={requestDeleteAlbum}>
						<Icon name="material-symbols:delete-rounded" size="sm" />
						{i18n(I18nKey.galleryAdminDeleteAlbum)}
					</button>
				{/if}
			</aside>

			<main class="admin-main">
				{#if createOpen}
					<AlbumForm onSubmit={handleCreateAlbum} onCancel={() => (createOpen = false)} />
				{:else if editingAlbum}
					<AlbumForm
						initial={{
							id: editingAlbum.id,
							name: editingAlbum.name,
							description: editingAlbum.description,
							date: editingAlbum.date,
							location: editingAlbum.location,
							tags: editingAlbum.tags,
						}}
						onSubmit={handleUpdateAlbum}
						onCancel={() => (editingAlbum = null)}
					/>
				{/if}

				<UploadZone
					disabled={!selectedAlbumId}
					uploading={uploading}
					onFiles={handleFiles}
				/>

				{#if uploads.length > 0}
					<div class="upload-list">
						{#each uploads as item (item.id)}
							<div class="upload-item">
								<div>
									<div class="upload-item__name">{item.name}</div>
									<div class="upload-item__track">
										<div
											class="upload-item__bar"
											style={`width: ${Math.round(item.progress * 100)}%`}
										></div>
									</div>
								</div>
								<span
									class={[
										"upload-item__status",
										`upload-item__status--${item.status}`,
									]}
								>
									{#if item.status === "queued"}
										…
									{:else if item.status === "uploading"}
										{i18n(I18nKey.galleryAdminUploading)}
										{Math.round(item.progress * 100)}%
									{:else if item.status === "success"}
										<Icon name="material-symbols:check-circle-rounded" size="sm" />
										{i18n(I18nKey.galleryAdminUploadSuccess)}
									{:else}
										<Icon name="material-symbols:error-rounded" size="sm" />
										{i18n(I18nKey.galleryAdminUploadFail)}
									{/if}
								</span>
							</div>
						{/each}
					</div>
				{/if}

				<PhotoGrid
					albumId={selectedAlbumId}
					photos={selectedAlbum?.photos || []}
					coverPath={selectedAlbum?.cover}
					onDelete={requestDeletePhoto}
					onCopy={copyLink}
					onSetCover={setCover}
				/>
			</main>
		</div>
	</div>
{/if}

{#if confirmState}
	<ConfirmDialog
		title={confirmState.title}
		message={confirmState.message}
		confirmText={confirmState.confirmText}
		cancelText={i18n(I18nKey.galleryAdminCancel)}
		danger={confirmState.danger}
		busy={confirmState.busy}
		onConfirm={runConfirm}
		onCancel={() => (confirmState = null)}
	/>
{/if}

<div class="toast-container">
	{#each toasts as t (t.id)}
		<div class={["toast", `toast--${t.kind}`]}>{t.text}</div>
	{/each}
</div>
