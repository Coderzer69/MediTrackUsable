import type { Plugin } from 'vite';

export function generateDarkCss(options: { srcDir: string; themeCssPath: string }): string;
export function darkThemePlugin(options: { srcDir: string; themeCssPath: string; outFile: string }): Plugin;
