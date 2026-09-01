declare module '@tailwindcss/vite' {
  import type { Plugin } from 'vite';

  type PluginOptions = {
    optimize?: boolean | { minify?: boolean };
  };

  export default function tailwindcss(opts?: PluginOptions): Plugin[];
}
