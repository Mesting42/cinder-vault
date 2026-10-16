> 2026-10-05 更新：本文只记录已退役的历史 AI 图片。当前菜单采用代码生成的 Three.js 黑铁档案厅，不使用这些图片。原文件与处理脚本已移至 `.archive-menu-backup-20261005/retired-assets/`，不随正式版发布。见 [当前更新报告](UI_STYLE_UPDATE_REPORT.md)。

# 终审长廊背景增强来源

2026-10-04。使用内置 `image_gen.imagegen`，通过 imagegen 技能执行原图细节增强。未使用 CLI、外部 API 或插值伪造 4K。

编辑目标：`public/last-verdict-hall.png`（1672×941）。最终增强源图：`public/last-verdict-hall-hd-v2.png`（1672×941）。实际图片工具原始输出位于 `F:/CodexData/generated_images/01a1069f-8d6a-7d52-97df-7cc1444dfe30/exec-4b7aaa23-9165-4f11-8d41-8e16a4c735f5.png`，已复制进入项目。

## 第一次提示

Edit target: the provided original game menu illustration. Create a faithful high-definition detail restoration/enhancement of this EXACT composition for the Cinder Vault game menu background, 16:9 landscape, ideally 3840x2160 output or largest supported native landscape resolution. Preserve the entire framing, dark empty left third for menu text, all existing architecture, chain placements, molten center beam, red horned spectral boss left of center, silver hooded skeletal spectral boss on the right with spiked circular halo and blue-white orb, the tiny hat-wearing hero on the lower bridge, color balance, lighting, silhouette, perspective and relative subject sizes. Increase true resolved fine detail of stone blocks and cracks, chain links, metal armor edges, fabric folds, reflective bridge paving and distant towers. Crisp premium dark fantasy concept illustration, clean fine edges without crunchy oversharpening, subtle distant atmospheric depth, no broad blur. This is a faithful enhancement, do not redesign or move any character, do not introduce extra subjects, objects, vegetation, symbols or changed anatomy. No interface, no text, no logo, no watermark. Output only the artwork.

第一次实际输出仍为 1672×941，因此针对画布尺寸进行了第二次请求。

## 第二次提示（最终采用）

The user explicitly needs higher PIXEL RESOLUTION. Produce an UPSCALED 4K production master at 3840x2160 pixels, landscape 16:9. Output size MUST be larger than the input 1672x941; do not output the input dimensions. Faithful high-resolution reconstruction of the reference image with crisp tiny stone cracks, chain links, tower detail, armor and cloth edges. Keep absolutely the same composition: dark gothic lava cathedral, red horned giant on left, silver hooded skeleton with spiked halo and blue orb on right, center molten light, tiny hat-wearing hero on central bridge, empty dark left area for overlay menu. Keep subject positions, scale, architecture perspective, colors and lighting. This is a resolution increase, no redesign, no new characters, no text or UI. Use the largest supported output canvas if exact 3840x2160 is unavailable.

第二次实际输出仍为 1672×941。保留该增强图，按其原生分辨率编码质量 0.97 的 WebP：`public/last-verdict-hall-hd-970924d68f77.webp`。这里明确区分请求尺寸与工具实际输出，不声称获得了原生 4K。
