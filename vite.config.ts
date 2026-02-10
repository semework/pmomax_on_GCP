import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';

const SKIP_PUBLIC_DIRS = new Set(['App_screenshots', 'for_intro']);

const copyPublicFiltered = () => ({
	name: 'copy-public-filtered',
	apply: 'build',
	closeBundle() {
		const root = process.cwd();
		const srcDir = path.join(root, 'public');
		const outDir = path.join(root, 'dist');

		const copyRecursive = (src: string, dest: string) => {
			const stat = fs.statSync(src);
			if (stat.isDirectory()) {
				const base = path.basename(src);
				if (SKIP_PUBLIC_DIRS.has(base)) return;
				fs.mkdirSync(dest, { recursive: true });
				for (const entry of fs.readdirSync(src)) {
					copyRecursive(path.join(src, entry), path.join(dest, entry));
				}
				return;
			}
			try {
				fs.mkdirSync(path.dirname(dest), { recursive: true });
				fs.copyFileSync(src, dest);
			} catch (err) {
				// Avoid failing builds on iCloud-evicted or missing public files.
				console.warn('[vite] Skipped public asset:', src);
			}
		};

		if (fs.existsSync(srcDir)) {
			copyRecursive(srcDir, outDir);
		}
	},
});

// Vite config (single export). Combines production build chunking and
// a small `define` shim so dependencies referencing `process.env` don't crash.
// Explicitly set React plugin to non-dev JSX runtime and ensure NODE_ENV is
// defined as production during builds so libraries that switch behavior on
// NODE_ENV don't end up in a development mode in the bundle.
export default defineConfig(({ mode }) => ({
	plugins: [react({ jsxRuntime: 'automatic', jsxDev: false }), copyPublicFiltered()],
	resolve: {
		alias: {
			'style-to-object': path.resolve(process.cwd(), 'src/shims/style-to-object.ts'),
			underscore: path.resolve(process.cwd(), 'node_modules/underscore/underscore-esm.js'),
		},
	},
	server: {
		host: true,
		port: 5173,
		strictPort: true,
	},
	define: {
		// Force NODE_ENV to production at build-time when undefined so
		// runtime libraries compiled with checks use production paths.
		'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
	},
	build: {
		outDir: 'dist',
		sourcemap: false,
		copyPublicDir: false,
		rollupOptions: {
			output: {
				manualChunks: {
					pdf: ['pdfjs-dist'],
					mammoth: ['mammoth'],
				},
			},
		},
	},
	// Helps dev prebundle; harmless in prod build.
	optimizeDeps: {
		include: ['pdfjs-dist', 'mammoth'],
	},
}));
