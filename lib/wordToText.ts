import { safeErrorMessage } from './safeError';
declare const process: any;
// lib/wordToText.ts
// Utility to extract text from .docx Word files using mammoth.
// Exports a single async function `wordToText` that accepts an ArrayBuffer / Uint8Array
// (and Buffer when running in Node) and returns plain text.
//
// Why runtime import?
// - In the browser, you generally want `mammoth/mammoth.browser`.
// - In Node, `mammoth` works fine with Buffer.
// Keeping the import inside the function avoids bundling surprises and keeps initial load light.

type MammothModule = {
	extractRawText: (arg: { arrayBuffer?: ArrayBuffer; buffer?: any }) => Promise<{ value?: string } & Record<string, any>>;
};

function isNodeRuntime(): boolean {
	// Safe in Vite/browser where `process` may be undefined.
	return typeof process !== 'undefined' && !!(process as any)?.versions?.node;
}

async function loadMammoth(): Promise<MammothModule> {
	// Prefer browser build when not in Node.
	if (!isNodeRuntime()) {
		try {
			const mod = (await import('mammoth/mammoth.browser')) as any;
			return (mod?.default ?? mod) as MammothModule;
		} catch {
			// fall through to generic import
		}
	}

	const mod = (await import('mammoth')) as any;
	return (mod?.default ?? mod) as MammothModule;
}

async function toArrayBuffer(input: ArrayBuffer | Uint8Array | any): Promise<ArrayBuffer> {
	if (input instanceof ArrayBuffer) return input;
	if (input instanceof Uint8Array) {
		// Respect byteOffset/byteLength so we don't leak a larger underlying buffer.
		return input.buffer.slice(input.byteOffset, input.byteOffset + input.byteLength);
	}

	// Last resort: Buffer-like objects with `.buffer`.
	if (input && typeof input === 'object' && input.buffer && typeof input.buffer === 'object') {
		try {
			const ab = input.buffer as ArrayBuffer;
			return ab;
		} catch {
			try {
				const mammoth = await loadMammoth();
				try {
					const size = (input && typeof input === 'object' && (input.byteLength || input.length)) || 0;
					if (size && size > 25_000_000) {
						console.warn('[wordToText] Large DOCX detected; parsing may take longer.');
					}
				} catch {
					// ignore size detection failures
				}

				// Node path: Buffer is best.
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				if (isNodeRuntime() && typeof Buffer !== 'undefined' && Buffer.isBuffer(input)) {
					// eslint-disable-next-line @typescript-eslint/ban-ts-comment
					// @ts-ignore
					const res = await mammoth.extractRawText({ buffer: input });
					return String(res?.value || '').trim();
				}

				// Browser (or non-Buffer) path: ArrayBuffer
				const ab = toArrayBuffer(input as any);
				const res = await mammoth.extractRawText({ arrayBuffer: ab });
				return String(res?.value || '').trim();
			} catch (err: any) {
				// Defensive fallback: return a safe string instead of throwing
				const fallbackText = `[No extractable text] DOCX parsing failed.\n\n${safeErrorMessage(err)}`;
				return fallbackText;
			}
		}

		// Browser (or non-Buffer) path: ArrayBuffer
		const ab = toArrayBuffer(input as any);
		const res = await mammoth.extractRawText({ arrayBuffer: ab });
		return String(res?.value || '').trim();
	} catch (err: any) {
		throw new Error(`wordToText failed: ${safeErrorMessage(err)}`);
	}
}

export default wordToText;
