/**
 * 图片 EXIF 方向处理。
 *
 * 手机竖拍照片的原始像素是横向的，靠 JPEG 的 EXIF Orientation 标记
 * 告诉浏览器"应该旋转后显示"。但 CDN（又拍云）自动转 webp 时会丢失
 * 该标记，导致图片横过来。这里在上传前读取 Orientation 并用 canvas
 * 把像素物理转正，存进存储的就是正向图。
 */

const ORIENTATION_TAG = 0x0112;
const EXIF_HEADER = 0x45786966; // "Exif"

/**
 * 解析 JPEG 的 EXIF Orientation（1-8）。
 * 非 JPEG 或没有 Orientation 标记时返回 1（正常）。
 */
export function getJpegOrientation(arrayBuffer: ArrayBuffer): number {
	const view = new DataView(arrayBuffer);
	if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return 1;

	let offset = 2;
	while (offset + 4 <= view.byteLength) {
		if (view.getUint8(offset) !== 0xff) {
			offset += 1;
			continue;
		}
		const marker = view.getUint8(offset + 1);
		// 跳过无长度段（SOI/DHT 等使用独立标记）
		if (
			marker === 0xd8 ||
			(marker >= 0xd0 && marker <= 0xd7) ||
			marker === 0x01
		) {
			offset += 2;
			continue;
		}
		if (marker === 0xd9 || marker === 0xda) break; // EOI / SOS
		const length = view.getUint16(offset + 2, false);
		if (length < 2) break;

		if (marker === 0xe1 && length >= 14) {
			// APP1: 检查 "Exif\0\0"
			if (view.getUint32(offset + 4, false) === EXIF_HEADER) {
				const tiff = offset + 10;
				const endianMark = view.getUint16(tiff, false);
				if (endianMark !== 0x4949 && endianMark !== 0x4d4d) break;
				const isLE = endianMark === 0x4949; // "II"
				const readU16 = (o: number) => view.getUint16(tiff + o, isLE);
				const readU32 = (o: number) => view.getUint32(tiff + o, isLE);
				if (readU16(2) !== 0x002a) break;
				const ifd0 = readU32(4);
				if (ifd0 + 2 > view.byteLength - tiff) break;
				const count = readU16(ifd0);
				for (let i = 0; i < count; i++) {
					const entry = ifd0 + 2 + i * 12;
					if (entry + 12 > view.byteLength - tiff) break;
					if (readU16(entry) === ORIENTATION_TAG) {
						const type = readU16(entry + 2);
						return type === 3 ? readU16(entry + 8) : readU32(entry + 8);
					}
				}
			}
		}
		offset += 2 + length;
	}
	return 1;
}

/**
 * 按 EXIF Orientation 旋转像素，返回转正后的 Blob。
 * 非 JPEG / 方向正常（<=1）时原样返回，不做任何处理。
 */
export async function normalizeImageOrientation(file: File): Promise<File> {
	if (!file.type.startsWith("image/jpeg")) return file;
	const buf = await file.arrayBuffer();
	const orientation = getJpegOrientation(buf);
	if (orientation <= 1) return file;

	// createImageBitmap 默认 imageOrientation: "from-image"，已按 EXIF 自动
	// 转正，直接复制到 canvas 即可，不要再套 transform 避免双重旋转。
	const img = await createImageBitmap(new Blob([buf], { type: "image/jpeg" }));
	const canvas = document.createElement("canvas");
	canvas.width = img.width;
	canvas.height = img.height;
	const ctx = canvas.getContext("2d");
	if (!ctx) {
		img.close();
		return file;
	}
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = "high";
	ctx.drawImage(img, 0, 0);
	img.close();

	const blob = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, "image/jpeg", 0.92),
	);
	if (!blob) return file;
	return new File([blob], file.name, { type: "image/jpeg" });
}
