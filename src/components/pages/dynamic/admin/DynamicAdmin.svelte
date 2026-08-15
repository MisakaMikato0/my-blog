<script lang="ts">
import dayjs from "dayjs";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import Icon from "@/components/common/Icon.svelte";
import { normalizeImageOrientation } from "@/utils/image-orientation";
import { url } from "@/utils/url-utils";
import ConfirmDialog from "./ConfirmDialog.svelte";
import UploadZone from "./UploadZone.svelte";

const TOKEN_KEY = "dynamic-admin-token";

interface AdminImage {
	path: string;
	alt: string;
	cdnUrl: string;
}

interface AdminEntry {
	id: string;
	content: string;
	images: Array<{ path: string; alt?: string }>;
	location: string;
	pinned: boolean;
	createdAt: string;
	updatedAt: string;
}

interface UploadTokenDto {
	policy: string;
	signature: string;
	uploadUrl: string;
	path: string;
	cdnUrl: string;
}

type ToastKind = "success" | "error" | "info";
type UploadStatus = "queued" | "uploading" | "success" | "error";

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
	cancelText: string;
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
let publishing = $state(false);
let cdnBase = $state("");
let items = $state<AdminEntry[]>([]);
let toasts = $state<Array<{ id: number; kind: ToastKind; text: string }>>([]);
let confirmState = $state<ConfirmState | null>(null);
let uploads = $state<UploadItem[]>([]);
let loginPassword = $state("");
let loginBusy = $state(false);
let loginError = $state(false);

// 发布表单
let editingId = $state<string | null>(null);
let content = $state("");
let formImages = $state<AdminImage[]>([]);
let location = $state("");
let pinned = $state(false);

let toastSeq = 0;
let uploadSeq = 0;

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

async function verify(password: string): Promise<boolean> {
	try {
		const res = await fetch("/api/dynamic/manage/verify", {
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

async function submitLogin() {
	if (!loginPassword || loginBusy) return;
	loginBusy = true;
	loginError = false;
	const ok = await verify(loginPassword);
	if (!ok) {
		loginError = true;
	} else {
		loginPassword = "";
	}
	loginBusy = false;
}

async function loadList() {
	loading = true;
	try {
		const data = await api<{ cdnBase: string; dynamics: AdminEntry[] }>(
			"/api/dynamic/manage/list",
		);
		cdnBase = data.cdnBase || "";
		items = Array.isArray(data.dynamics) ? data.dynamics : [];
	} catch (e) {
		toast("error", i18n(I18nKey.dynamicAdminLoadError));
		console.error("load dynamic list failed:", e);
	} finally {
		loading = false;
	}
}

$effect(() => {
	if (!token) {
		checking = false;
		return;
	}
	let cancelled = false;
	api("/api/dynamic/manage/verify", { method: "POST", body: JSON.stringify({}) })
		.then(() => {
			if (!cancelled) {
				authed = true;
				return loadList();
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
	items = [];
	resetForm();
}

function resetForm() {
	editingId = null;
	content = "";
	formImages = [];
	location = "";
	pinned = false;
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
	const itemsUpload: UploadItem[] = files.map((f) => ({
		id: ++uploadSeq,
		name: f.name,
		status: "queued",
		progress: 0,
	}));
	uploads = [...uploads, ...itemsUpload];

	for (let i = 0; i < files.length; i++) {
		let file = files[i];
		const item = itemsUpload[i];
		updateUpload(item.id, { status: "uploading", progress: 0 });
		try {
			// 上传前按 EXIF 方向转正，避免 CDN 转码丢方向导致图片横过来
			file = await normalizeImageOrientation(file);
			const tok = await api<UploadTokenDto>("/api/dynamic/upload-token", {
				method: "POST",
				body: JSON.stringify({ filename: file.name }),
			});
			const form = new FormData();
			form.append("policy", tok.policy);
			form.append("signature", tok.signature);
			form.append("file", file);
			await xhrUpload(tok.uploadUrl, form, (p) =>
				updateUpload(item.id, { progress: p }),
			);
			formImages = [
				...formImages,
				{ path: tok.path, alt: file.name.replace(/\.[^.]+$/, ""), cdnUrl: tok.cdnUrl },
			];
			updateUpload(item.id, { status: "success", progress: 1 });
		} catch (e) {
			updateUpload(item.id, {
				status: "error",
				error: e instanceof Error ? e.message : String(e),
			});
			toast("error", `${i18n(I18nKey.dynamicUploadFail)}: ${item.name}`);
		}
	}

	if (!itemsUpload.some((i) => i.status === "error")) {
		toast("success", i18n(I18nKey.dynamicUploadSuccess));
	}
	setTimeout(() => {
		const ids = new Set(
			itemsUpload.filter((i) => i.status === "success").map((i) => i.id),
		);
		if (ids.size > 0) uploads = uploads.filter((u) => !ids.has(u.id));
	}, 4000);
}

function removeFormImage(path: string) {
	formImages = formImages.filter((img) => img.path !== path);
}

async function publish() {
	const trimmed = content.trim();
	if (!trimmed) {
		toast("error", i18n(I18nKey.dynamicAdminContent));
		return;
	}
	publishing = true;
	try {
		const body = {
			content: trimmed,
			images: formImages.map((img) => ({ path: img.path, alt: img.alt })),
			location: location.trim(),
			pinned,
		};
		if (editingId) {
			await api("/api/dynamic/manage/update", {
				method: "POST",
				body: JSON.stringify({ id: editingId, ...body }),
			});
		} else {
			await api("/api/dynamic/manage", {
				method: "POST",
				body: JSON.stringify(body),
			});
		}
		resetForm();
		await loadList();
		toast("success", i18n(I18nKey.dynamicAdminSaveSuccess));
	} catch (e) {
		toast("error", i18n(I18nKey.dynamicAdminLoadError));
		console.error(e);
	} finally {
		publishing = false;
	}
}

function startEdit(entry: AdminEntry) {
	editingId = entry.id;
	content = entry.content;
	location = entry.location;
	pinned = entry.pinned;
	formImages = (entry.images || []).map((img) => ({
		path: img.path,
		alt: img.alt || "",
		cdnUrl: `${cdnBase}${img.path}`,
	}));
	window.scrollTo({ top: 0, behavior: "smooth" });
}

async function togglePin(entry: AdminEntry) {
	try {
		await api("/api/dynamic/manage/pin", {
			method: "POST",
			body: JSON.stringify({ id: entry.id, pinned: !entry.pinned }),
		});
		await loadList();
	} catch (e) {
		toast("error", i18n(I18nKey.dynamicAdminLoadError));
		console.error(e);
	}
}

function requestDelete(entry: AdminEntry) {
	confirmState = {
		title: i18n(I18nKey.dynamicAdminDelete),
		message: i18n(I18nKey.dynamicAdminDeleteConfirm),
		confirmText: i18n(I18nKey.dynamicAdminDelete),
		cancelText: i18n(I18nKey.dynamicAdminCancel),
		danger: true,
		busy: false,
		run: async () => {
			await api("/api/dynamic/manage/delete", {
				method: "POST",
				body: JSON.stringify({ id: entry.id }),
			});
			if (editingId === entry.id) resetForm();
			await loadList();
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
		toast("success", i18n(I18nKey.dynamicAdminDeleteSuccess));
	} catch (e) {
		confirmState = { ...state, busy: false };
		toast("error", i18n(I18nKey.dynamicAdminLoadError));
		console.error(e);
	}
}

function formatTime(iso: string): string {
	return dayjs(iso).format("YYYY-MM-DD HH:mm");
}

function excerpt(markdown: string, max = 80): string {
	const plain = markdown
		.replace(/!\[[^\]]*\]\([^)]*\)/g, "")
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
		.replace(/[#>*`_~|-]/g, "")
		.replace(/\s+/g, " ")
		.trim();
	return plain.length > max ? `${plain.slice(0, max)}…` : plain;
}
</script>

{#if checking}
	<div class="admin-loading">
		<Icon name="svg-spinners:ring-resize" size="sm" />
		<span>{i18n(I18nKey.dynamicAdminRefresh)}...</span>
	</div>
{:else if !authed}
	<div class="admin-login card-base">
		<Icon name="material-symbols:dynamic-feed" class="admin-login__icon" />
		<h2>{i18n(I18nKey.dynamicAdmin)}</h2>
		<p>{i18n(I18nKey.dynamicAdminPassword)}</p>
		<input
			type="password"
			bind:value={loginPassword}
			placeholder={i18n(I18nKey.dynamicAdminPassword)}
			onkeydown={(e) => {
				if (e.key === "Enter") submitLogin();
			}}
			autocomplete="current-password"
		/>
		<button class="admin-btn admin-btn--primary" onclick={submitLogin} disabled={loginBusy}>
			{#if loginBusy}
				<Icon name="svg-spinners:ring-resize" size="sm" />
			{/if}
			{i18n(I18nKey.dynamicAdminLogin)}
		</button>
		{#if loginError}
			<p class="admin-login__error">{i18n(I18nKey.dynamicAdminLoginError)}</p>
		{/if}
	</div>
{:else}
	<div class="admin-app">
		<header class="admin-header">
			<div class="admin-header__left">
				<a class="admin-btn" href={url("/dynamic/")}>
					<Icon name="material-symbols:arrow-back" size="sm" />
					{i18n(I18nKey.dynamicAdminBackToDynamic)}
				</a>
				<h1 class="admin-header__title">{i18n(I18nKey.dynamicAdmin)}</h1>
			</div>
			<div class="admin-header__actions">
				<button class="admin-btn" onclick={loadList} disabled={loading}>
					<Icon name="material-symbols:refresh-rounded" size="sm" />
					{i18n(I18nKey.dynamicAdminRefresh)}
				</button>
				<button class="admin-btn" onclick={logout}>
					<Icon name="material-symbols:logout-rounded" size="sm" />
					{i18n(I18nKey.dynamicAdminLogout)}
				</button>
			</div>
		</header>

		<div class="admin-body">
			<main class="admin-main">
				<!-- 发布/编辑表单 -->
				<section class="admin-panel dynamic-form">
					<h2 class="dynamic-form__title">
						{editingId ? i18n(I18nKey.dynamicAdminEdit) : i18n(I18nKey.dynamicAdminPublish)}
					</h2>

					<label class="dynamic-form__label" for="dynamic-content">
						{i18n(I18nKey.dynamicAdminContent)}
					</label>
					<textarea
						id="dynamic-content"
						class="dynamic-form__textarea"
						bind:value={content}
						rows="5"
						placeholder={i18n(I18nKey.dynamicAdminContentPlaceholder)}
					></textarea>

					<div class="dynamic-form__section">
						<span class="dynamic-form__label">{i18n(I18nKey.dynamicAdminImages)}</span>
						<UploadZone disabled={uploading} uploading={uploading} onFiles={handleFiles} />

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
												{i18n(I18nKey.dynamicUploading)}
												{Math.round(item.progress * 100)}%
											{:else if item.status === "success"}
												<Icon name="material-symbols:check-circle-rounded" size="sm" />
												{i18n(I18nKey.dynamicUploadSuccess)}
											{:else}
												<Icon name="material-symbols:error-rounded" size="sm" />
												{i18n(I18nKey.dynamicUploadFail)}
											{/if}
										</span>
									</div>
								{/each}
							</div>
						{/if}

						{#if formImages.length > 0}
							<div class="dynamic-form__images">
								{#each formImages as img (img.path)}
									<div class="dynamic-form__image">
										<img src={img.cdnUrl} alt={img.alt} loading="lazy" />
										<button
											type="button"
											class="dynamic-form__image-remove"
											title={i18n(I18nKey.dynamicAdminDelete)}
											onclick={() => removeFormImage(img.path)}
										>
											<Icon name="material-symbols:close-rounded" size="sm" />
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>

					<div class="dynamic-form__row">
						<label class="dynamic-form__field">
							<span class="dynamic-form__label">{i18n(I18nKey.dynamicAdminLocation)}</span>
							<input
								class="admin-input"
								type="text"
								bind:value={location}
								maxlength="60"
								placeholder={i18n(I18nKey.dynamicAdminLocationPlaceholder)}
							/>
						</label>
						<label class="dynamic-form__pin">
							<input type="checkbox" bind:checked={pinned} />
							<span>{i18n(I18nKey.dynamicAdminPinned)}</span>
						</label>
					</div>

					<div class="dynamic-form__actions">
						{#if editingId}
							<button class="admin-btn" onclick={resetForm} disabled={publishing}>
								{i18n(I18nKey.dynamicAdminCancel)}
							</button>
						{/if}
						<button
							class="admin-btn admin-btn--primary"
							onclick={publish}
							disabled={publishing || uploading}
						>
							{#if publishing}
								<Icon name="svg-spinners:ring-resize" size="sm" />
							{/if}
							{editingId
								? i18n(I18nKey.dynamicAdminSave)
								: publishing
									? i18n(I18nKey.dynamicAdminPublishing)
									: i18n(I18nKey.dynamicAdminPublish)}
						</button>
					</div>
				</section>

				<!-- 已发布列表 -->
				<section class="admin-panel dynamic-list">
					<h2 class="dynamic-form__title">{i18n(I18nKey.dynamic)}（{items.length}）</h2>

					{#if loading}
						<div class="admin-loading">
							<Icon name="svg-spinners:ring-resize" size="sm" />
							<span>{i18n(I18nKey.dynamicAdminRefresh)}...</span>
						</div>
					{:else if items.length === 0}
						<div class="admin-empty">{i18n(I18nKey.dynamicAdminEmpty)}</div>
					{:else}
						<div class="dynamic-list__items">
							{#each items as entry (entry.id)}
								<article class="dynamic-list__item">
									<div class="dynamic-list__main">
										<div class="dynamic-list__head">
											<time datetime={entry.createdAt}>{formatTime(entry.createdAt)}</time>
											{#if entry.pinned}
												<span class="dynamic-list__pin">
												<Icon name="material-symbols:pinboard" size="xs" />
													{i18n(I18nKey.dynamicPinned)}
												</span>
											{/if}
										</div>
										<p class="dynamic-list__text">{excerpt(entry.content)}</p>
										{#if entry.location}
											<div class="dynamic-list__location">
												<Icon name="material-symbols:location-on-rounded" size="xs" />
												<span>{entry.location}</span>
											</div>
										{/if}
										{#if entry.images.length > 0}
											<div class="dynamic-list__thumbs">
												{#each entry.images as img (img.path)}
													<img
														src={`${cdnBase}${img.path}`}
														alt={img.alt || ""}
														loading="lazy"
													/>
												{/each}
											</div>
										{/if}
									</div>
									<div class="dynamic-list__actions">
										<button class="admin-btn" onclick={() => startEdit(entry)}>
											<Icon name="material-symbols:edit-square-outline" size="sm" />
											{i18n(I18nKey.dynamicAdminEdit)}
										</button>
										<button class="admin-btn" onclick={() => togglePin(entry)}>
											<Icon name="material-symbols:pinboard" size="sm" />
											{entry.pinned ? i18n(I18nKey.dynamicAdminPinned) : i18n(I18nKey.dynamicPinned)}
										</button>
										<button class="admin-btn admin-btn--danger" onclick={() => requestDelete(entry)}>
											<Icon name="material-symbols:delete-rounded" size="sm" />
											{i18n(I18nKey.dynamicAdminDelete)}
										</button>
									</div>
								</article>
							{/each}
						</div>
					{/if}
				</section>
			</main>
		</div>
	</div>
{/if}

{#if confirmState}
	<ConfirmDialog
		title={confirmState.title}
		message={confirmState.message}
		confirmText={confirmState.confirmText}
		cancelText={confirmState.cancelText}
		danger={confirmState.danger}
		busy={confirmState.busy}
		onConfirm={runConfirm}
		onCancel={() => (confirmState = null)}
	/>
{/if}

{#if toasts.length > 0}
	<div class="admin-toasts">
		{#each toasts as t (t.id)}
			<div class={`admin-toast admin-toast--${t.kind}`}>{t.text}</div>
		{/each}
	</div>
{/if}

<style>
	.dynamic-form__title {
		font-size: 1.05rem;
		font-weight: 600;
		margin-bottom: 0.75rem;
	}

	.dynamic-form__label {
		display: block;
		font-size: 0.8125rem;
		font-weight: 600;
		margin-bottom: 0.4rem;
	}

	.dynamic-form__textarea {
		width: 100%;
		min-height: 7rem;
		padding: 0.6rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--line-divider, rgba(0, 0, 0, 0.12));
		background: var(--input-bg, rgba(255, 255, 255, 0.6));
		color: var(--text-primary, inherit);
		font-size: 0.9rem;
		line-height: 1.6;
		resize: vertical;
	}

	.dynamic-form__textarea:focus {
		outline: 2px solid var(--primary);
		outline-offset: 1px;
	}

	.dynamic-form__section {
		margin-top: 1rem;
	}

	.dynamic-form__row {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		margin-top: 1rem;
	}

	.dynamic-form__field {
		flex: 1;
		display: block;
	}

	.admin-input {
		width: 100%;
		padding: 0.5rem 0.75rem;
		border-radius: 0.5rem;
		border: 1px solid var(--line-divider, rgba(0, 0, 0, 0.12));
		background: var(--input-bg, rgba(255, 255, 255, 0.6));
		color: var(--text-primary, inherit);
		font-size: 0.875rem;
	}

	.admin-input:focus {
		outline: 2px solid var(--primary);
		outline-offset: 1px;
	}

	.dynamic-form__pin {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		padding-bottom: 0.5rem;
		font-size: 0.875rem;
		cursor: pointer;
		user-select: none;
	}

	.dynamic-form__actions {
		display: flex;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 1.25rem;
	}

	.dynamic-form__images {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: 0.5rem;
		margin-top: 0.75rem;
	}

	.dynamic-form__image {
		position: relative;
		aspect-ratio: 1;
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.dynamic-form__image img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.dynamic-form__image-remove {
		position: absolute;
		top: 4px;
		right: 4px;
		width: 1.5rem;
		height: 1.5rem;
		border-radius: 9999px;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		background: rgba(0, 0, 0, 0.55);
		color: #fff;
		border: none;
		cursor: pointer;
	}

	.dynamic-form__image-remove:hover {
		background: rgba(220, 38, 38, 0.85);
	}

	.dynamic-list__items {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.dynamic-list__item {
		display: flex;
		align-items: flex-start;
		gap: 1rem;
		padding: 0.875rem 1rem;
		border: 1px solid var(--line-divider, rgba(0, 0, 0, 0.1));
		border-radius: 0.75rem;
	}

	.dynamic-list__main {
		flex: 1;
		min-width: 0;
	}

	.dynamic-list__head {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--text-tertiary, rgba(128, 128, 128, 0.8));
	}

	.dynamic-list__pin {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		color: var(--primary);
		font-size: 0.75rem;
	}

	.dynamic-list__text {
		margin-top: 0.35rem;
		font-size: 0.9rem;
		line-height: 1.5;
		overflow-wrap: break-word;
	}

	.dynamic-list__location {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin-top: 0.35rem;
		font-size: 0.8125rem;
		color: var(--text-tertiary, rgba(128, 128, 128, 0.8));
	}

	.dynamic-list__thumbs {
		display: flex;
		gap: 0.4rem;
		margin-top: 0.6rem;
		flex-wrap: wrap;
	}

	.dynamic-list__thumbs img {
		width: 3.5rem;
		height: 3.5rem;
		object-fit: cover;
		border-radius: 0.4rem;
	}

	.dynamic-list__actions {
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
		flex-shrink: 0;
	}

	.admin-empty {
		padding: 2rem 0;
		text-align: center;
		color: var(--text-tertiary, rgba(128, 128, 128, 0.8));
	}

	@media (max-width: 640px) {
		.dynamic-list__item {
			flex-direction: column;
		}

		.dynamic-list__actions {
			flex-direction: row;
			flex-wrap: wrap;
		}
	}
</style>
