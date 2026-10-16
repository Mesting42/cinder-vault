import {defineConfig} from 'vite';
export default defineConfig({base:'/',server:{port:5187,strictPort:true},build:{chunkSizeWarningLimit:650,rollupOptions:{output:{manualChunks:{three:['three','three/addons/postprocessing/EffectComposer.js','three/addons/postprocessing/RenderPass.js','three/addons/postprocessing/UnrealBloomPass.js','three/addons/postprocessing/OutputPass.js']}}}}});
