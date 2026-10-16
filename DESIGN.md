---
name: "断誓之下 / BELOW THE OATH"
description: "克制黑铁建筑中的战斗可读性。"
colors:
  background: "#080c12"
  surface: "#10151d"
  surface-raised: "#1a222d"
  ink: "#edf0f5"
  ink-secondary: "#b4bdc9"
  ink-muted: "#8c98a9"
  border: "#44505e"
  border-soft: "#2b3541"
  accent: "#ad3946"
  accent-light: "#e47881"
  accent-dark: "#68252e"
  accent-hover: "#8f2f3e"
  focus: "#e9edf3"
  damage-physical: "#ff756b"
  damage-physical-critical: "#ffa198"
  damage-magic: "#cd8bff"
  damage-magic-critical: "#efd0ff"
  health-low: "#b74042"
  health-high: "#ef9a73"
  shield-low: "#bac8c3"
  shield-high: "#ffffff"
typography:
  display:
    fontFamily: "'Cinder Display', 'Arial Narrow', sans-serif"
    fontSize: "clamp(76px, 7.8vw, 122px)"
    fontWeight: 600
    lineHeight: 0.77
    letterSpacing: "0.025em"
  headline:
    fontFamily: "'Cinder Sans', 'Microsoft YaHei UI', sans-serif"
    fontSize: "clamp(26px, 2.8vw, 43px)"
    fontWeight: 650
    letterSpacing: "0.06em"
  title:
    fontFamily: "'Cinder Sans', 'Microsoft YaHei UI', sans-serif"
    fontSize: "35px"
    fontWeight: 650
    letterSpacing: "0.055em"
  body:
    fontFamily: "'Cinder Sans', 'Microsoft YaHei UI', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.9
  label:
    fontFamily: "'Cinder Sans', 'Microsoft YaHei UI', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    letterSpacing: "0.08em"
  action:
    fontFamily: "'Cinder Sans', 'Microsoft YaHei UI', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "0.04em"
  metric:
    fontFamily: "'Cinder Display', 'Arial Narrow', sans-serif"
    fontSize: "33px"
    fontWeight: 500
    lineHeight: 1
rounded:
  control: "0"
  toggle-track: "10px"
  joystick: "50%"
components:
  button-primary:
    backgroundColor: "{colors.accent-dark}"
    textColor: "{colors.ink}"
    typography: "{typography.action}"
    rounded: "{rounded.control}"
    padding: "17px 22px"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
    textColor: "{colors.ink}"
  button-secondary:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "10px 12px"
  menu-navigation:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.control}"
    padding: "7px 12px"
    height: "52px"
    width: "276px"
  settings-select:
    backgroundColor: "#1c2532"
    textColor: "#dee6f1"
    rounded: "{rounded.control}"
    padding: "10px 12px"
    width: "210px"
  settings-toggle:
    textColor: "#c1ccda"
    padding: "8px 0 8px 12px"
  build-chip:
    backgroundColor: "#172232d9"
    textColor: "#b7cbe6"
    padding: "8px 10px"
  class-option:
    backgroundColor: "#151c25bf"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "20px 13px 20px 20px"
  iron-panel:
    backgroundColor: "#111720f7"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "36px 45px"
    width: "min(770px, 92vw)"
  vitality:
    textColor: "#ed8b84"
  touch-action:
    backgroundColor: "#172232db"
    textColor: "#d8e3f4"
    rounded: "{rounded.control}"
    size: "58px"
---

# Design System: 断誓之下 / BELOW THE OATH

## Overview

**Creative North Star: "黑铁档案厅"**

设计主张是克制黑铁建筑中的战斗可读性。黑铁、冷白文字与有限的暗红状态共同构成全游戏界面的视觉身份：沉静、坚硬、清晰。建筑与原创余火徽记承载氛围，操作信息靠字体、层次和真实状态建立优先级。

界面以紧凑的控制和清晰的分区组织信息。职业选择允许模型成为视觉焦点；设置、地图、装备和战斗 HUD 使用同一套黑铁表面与文字规则。完整的遮罩面板和局部透明 HUD 分别服务暂停阅读与实时战斗，不用装饰削弱当前任务。

低幅度环境运动属于场景材质表达。主菜单的档案厅由 Three.js 几何体、灯光、雾和悬浮印章构建；减少动态效果时保留静态构图与完整操作。

**Key Characteristics:**

- 黑铁底色和灰蓝表面层次，冷白作为主要阅读色。
- 暗红统一选择、确认和已开启状态。
- 中文无衬线与窄体英文形成明确的角色分工。
- 直边、细描边和不对称切角重复出现。
- 战斗色义、百分比生命状态和触屏可操作性优先于装饰。

## Colors

调色板以铁黑和灰蓝中性色为底，暗红负责操作状态，战斗信息保留独立语义色。前置 token 值是规范来源；本文不建立另一套色值。

### Primary

- **暗红余烬**（`accent`、`accent-dark`、`accent-light`）：深暗红用于确认按钮，暗红渐变用于菜单与职业选中态，较亮红用于细小状态标记与强调。按钮悬停使用 `accent-hover`。
- 选中菜单行和选中职业卡片均使用暗红底与红色描边，同时保留图标、文字和状态标记。

### Secondary

- **物理伤害红**（`damage-physical`、`damage-physical-critical`）：用于物理伤害数值；暴击使用较浅的同类色。
- **魔法伤害紫**（`damage-magic`、`damage-magic-critical`）：用于魔法伤害数值与相关资源提示；暴击使用较浅紫色。
- **生命红与护盾白**（`health-low` / `health-high`、`shield-low` / `shield-high`）：用于两条生命状态填充。HUD 同时提供图标和百分比文字，不依赖颜色区分。
- 职业图标、特定技能和 Boss 状态沿用各自已有的战斗语义；它们不成为通用界面的第二品牌色。

### Neutral

- **深铁黑**（`background`）：整个应用的底色。
- **黑铁表面**（`surface`、`surface-raised`）：承载阅读和控件，靠明度差形成层次。
- **冷白文字**（`ink`）：标题、当前任务和主要数值。
- **冷灰文字**（`ink-secondary`、`ink-muted`）：说明、辅助标签与次要信息。
- **铁边**（`border`、`border-soft`）：边界、分隔和非选中控件。
- **冷白焦点**（`focus`）：键盘焦点，使用清楚的外轮廓。

**The Combat Meaning Rule.** 物理红、魔法紫、生命红、护盾白保持独立语义；共享暗红主题不得覆盖它们。

**The State Carries More Than Color Rule.** 选中、开启、冷却与资源数量必须保留对应文字、图标、标记或数值，不能只改变颜色。

## Typography

**Display Font:** 自托管 Teko，CSS 内部别名为 `Cinder Display`，后备为 Arial Narrow 与 sans-serif。

**Body Font:** 自托管 Noto Sans SC，CSS 内部别名为 `Cinder Sans`，后备为 Microsoft YaHei UI 与 sans-serif。

两个别名用于源码兼容，并非游戏名称或新增品牌字体。WOFF2 子集使用 SIL Open Font License 1.1，授权文件与来源记录位于 `public/fonts/`；运行时字体无需外部请求。新增中文文案需要确认子集覆盖，缺字由后备字体接管。

**Character:** 中文保持清晰、坚实的无衬线阅读，英文标题与大数值使用压缩的竖向结构。短标题可加宽字距，长说明保持自然的阅读密度。按钮、键位、输入、选择器和输出采用等宽数字排列。

### Hierarchy

- **Display**：英文游戏标题，使用前置 `display` token；桌面为两行窄体大字。中文游戏名另用正文家族，字号为（18px）、字重为（650）、字距为（0.48em）。
- **Headline**：职业选择主标题，使用 `headline` token。
- **Title**：普通弹窗标题，使用 `title` token。设置标题（30px）、地图标题（30px）和结算标题（60px）是已有组件差异，不构成通用字号阶梯。
- **Body**：普通弹窗说明使用 `body` token。职业说明为（12px）与（1.85）行高；设置说明为（11px）与（1.7）行高，最长约（48ch）。
- **Label**：菜单中文动作名使用 `label` token。英文动作副标签为（10px）、字重为（500）、字距为（0.10em）；短副标签服从主中文标签。
- **Action**：共享确认按钮使用 `action` token。职业确认按钮保留其已有（14px）尺寸。
- **Metric**：职业统计使用 `metric` token；结算统计使用相同窄体家族，字号为（40px）。

**The One Chinese Reading Voice Rule.** 中文标题、菜单、设置、装备说明和 HUD 使用同一无衬线家族；窄体字仅承担英文展示与已有的大数值角色。

## Layout

应用是占满视口的实时游戏画布与叠加界面。主菜单、职业选择、地图、暂停、设置和结算均是全视口层，控件以明确的固定区、流式内容区和可滚动阅读区组合；不套用网页长页布局。

已实现主菜单保留左侧标题和纵向菜单，右侧为活的档案厅与悬浮徽记。桌面菜单轨为（276px）宽，单行为（52px），间距为（6px）。这是主菜单的已确认构图，其他界面按自身任务安排信息。

职业选择桌面采用职业列表、模型、详情三列，初始比例为（30% / 39% / 31%）；详情独立滚动。普通弹窗宽度为（min(770px, 92vw)），设置为（min(920px, 94vw)），地图为（min(880px, 94vw)）。设置保持标题、标签导航和页脚可见，正文区域滚动；操作行在桌面左右组织标签与控件，保留清楚分隔。

手机以横屏游戏为目标，使用安全区域变量：左右至少（14px），上下至少（10px）。横屏高度（540px）以下压缩标题、间距与模型说明，菜单触屏行为（44px）高；（420px）以下进一步压缩标题。小横屏菜单隐藏设置和全屏的重复菜单行，顶部独立设置入口仍可使用。竖屏显示旋转提示并暂停进度。

HUD 沿视口边缘组织，中央保留房间与战斗视野。左上是生命、护盾、武器和资源，右上是暂停与地图，底部为技能和触屏操作。生命区桌面宽（240px），矮横屏为（202px），窄横屏为（190px）；手机地图缩小为局部入口。装备与暂停位于同一操作行。

未建立统一的间距 token 阶梯。前置组件记录已采用的内边距；新增区域延续相邻真实组件的密度，不从本文推导虚构的全局尺度。

## Elevation & Depth

界面深度结合真实场景透视、表面明度与少量黑色阴影。主菜单的几何与灯光提供建筑重量，交互行和职业卡片保持平面；它们不会因悬停抬起或放大。阅读遮罩使用暗色背景与（7px）背景模糊，主体面板接近不透明，避免战斗画面干扰文字。

### Shadow Vocabulary

- **阅读面板**（`0 24px 70px #0007`）：地图、普通弹窗和结算；设置使用更深的（`0 24px 70px #0009`）。
- **标题可读性**（`0 4px 20px #0009`）：主菜单大标题与场景分离。
- **HUD 数值可读性**（`drop-shadow(0 2px 4px #000a)`）：生命区域在场景上保持清楚。
- **触屏控件嵌层**（`inset 0 0 0 2px #1019289c, 0 2px 6px #0005`）：触屏按钮的边框厚度与局部深度。

**The Quiet Controls Rule.** 菜单行、职业卡片和确认按钮用底色与描边表达状态；保持既有的无位移交互，场景环境动作不影响点击目标。

主菜单场景以不超过（30 FPS）更新。悬浮徽记、火盆、灯光、微尘与地雾只有低幅度变化；隐藏页面、离开菜单与屏幕方向阻塞时停止有效绘制。系统或游戏设置要求减少动态效果时停止环境时间推进，必要状态变更仍可重绘。具体已实现 motion 值记录于 sidecar，不能外推为所有新控件的动画时长。

## Shapes

基础语言是直线、细描边与不对称切角，圆角 token `control` 对应方正控件。主确认按钮与职业卡片切去右上及左下（9px），阅读面板切去对应（12px）；菜单行切去右上（8px），小工具按钮切去右上（6px），触屏动作切去对应（7px）。切角由 CSS polygon 构成，不用贴图模拟。

描边通常为（1px）。键盘焦点为（2px）冷白 outline，偏移（3px）。输入与选择器保留方正边界；开关轨道与双摇杆因交互惯例保留圆形或胶囊形，并不是所有控件都要切角。

原创 SVG 余火徽记采用分段外框、冷白中轴和暗红侧片，替换旧方框 V 标记。左上身份统一显示「BELOW THE OATH / 断誓之下」。场景中的挤出印章与 SVG 保持同一几何余火意象，各自服务真实三维材质与二维身份识别。

## Components

### Buttons

共享动作保持坚硬、平静、可读。

- **Primary:** 深暗红底、冷白字与红色细边；普通动作内边距见 `button-primary`，最小点击高度（44px）。职业确认继承同一颜色与切角。
- **Hover / Active:** 悬停底色转为 `accent-hover`，按下转为已实现的暗红（#a13a46）；不会平移、抬升或增加发光。
- **Secondary:** 冷灰文字、柔和铁边，内边距见 `button-secondary`；悬停提升文字与底色层次。
- **Focus / Disabled:** 全应用冷白焦点轮廓保持可见。已有设置辅助按钮禁用时透明度为（0.45），保留原尺寸。

### Chips

装备、被动与协同标签是精简的信息标记。

- 普通标签用深灰蓝底与冷灰蓝文字，内边距见 `build-chip`。
- 协同和天赋标签使用暗红紫调表面、浅色文字和有色描边；这表示构筑类别，不表示主操作。
- 标签保留真实名称和说明。隐藏的构筑 HUD 容器不作为新增主屏信息密度的依据。

### Cards / Containers

职业卡片支持选择；阅读容器支持理解当前状态。

- **Class selection:** 默认黑铁透明底；选中使用暗红渐变与红边，另有明确勾选状态。职业图标仍保留身份色。常规卡片最小高度（112px），矮横屏触屏版本为（60px）。
- **Reading panels:** 接近不透明的黑铁底、细铁边与切角；使用阅读面板阴影。装备列表内项使用两列网格、（10px）间距和（15px 16px）内边距。
- **Modal headings:** 暂停标题为「游戏暂停」，地图标题为「地牢地图」。动作区允许换行，触屏内容超高时容器内部滚动。

### Inputs / Fields

设置控件直接呈现当前值。

- 选择器采用方正深铁表面、细边、冷白文字与（44px）最小高度。滑杆保持浏览器原生可操作性，采用红色 accent 与右侧数值。
- 开关使用（32px × 18px）轨道、（10px）圆钮和独立的（44px）点击高度；开启时轨道变红并移动圆钮，文字与 `aria-checked` 同步。
- 设置标签导航以红色底层和（2px）底边表示当前页，并使用 `aria-selected`。
- 错误与危险操作沿用较亮红色提示；既有帮助文字放在控件标签下方，不覆盖控件值。

### Navigation

主菜单是一条纵向档案式动作轨：图标、中文动作、英文短副标签与箭头共同组成一行。选中、悬停和焦点使用暗红背景与红边；不会移动整行。箭头的既有位移（2px）是局部反馈，减少动态效果时停止。

手机保留（44px）动作行与独立设置入口。页面标题只承担当前界面识别；不叠加重复的装饰性标题眉线。

### Vitality HUD

生命与护盾各有图标、细进度条和百分比文字。生命红条常规高（8px），护盾白条高（6px）；矮横屏生命条为（7px）。百分比与填充同步，数值采用等宽数字；护盾无固定上限时沿用运行时已获得的最高量作为显示基准。

当前武器、资源数量、技能与主动装置冷却紧邻各自图标或名称。魔法资源保留紫色，技能可用状态保留真实语义。

### Touch Actions

触屏动作以 SVG 图标为主，保留数量、冷却遮罩和交互就绪提示。

- 默认动作尺寸为（58px），小工具与暂停入口至少（44px）；具体矮横屏动作沿用既有尺寸。
- 数量在右上小标记显示；冷却通过覆盖层与真实数值表达。可交互时显示动作提示，不重新增加每个按钮的常驻文字标签。
- 左右摇杆分别承担移动和瞄准，轨道与拇指圆钮保持圆形；在设置中分别调整大小与位置。
- 每个图标按钮保留可访问名称，焦点继承共同规则。

## Do's and Don'ts

### Do:

- **Do** 以黑铁表面、冷白中文字和有限暗红状态扩展新界面。
- **Do** 保留物理红、魔法紫、生命红与护盾白的明确战斗色义。
- **Do** 用文字、图标或状态标记辅助颜色区分，并保留百分比、数量、冷却和交互提示。
- **Do** 延续切角、细边与安静的悬停反馈，按组件真实用途选择尺寸与内边距。
- **Do** 保持（44px）最小触屏目标、安全区域与内容内部滚动。
- **Do** 使用自托管字体；增加中文文案时检查字形覆盖。
- **Do** 让环境动效服从减少动态效果、页面可见性与实际画质设置。

### Don't:

- **Don't** 把菜单替换为 AI 图片、外部插画或远程位图背景；档案厅由代码构建。
- **Don't** 把通用暗红主题涂到所有战斗反馈或职业身份上。
- **Don't** 用装饰性眉题重复当前页面标题，或把隐藏的重复眉题推广为系统规则。
- **Don't** 让菜单行、职业卡片或确认按钮悬停时平移、抬升或膨胀。
- **Don't** 把内部字体别名、旧游戏名称或兼容数据键显示为新的游戏身份。
- **Don't** 从单一主菜单构图、旧样式残留或一次性尺寸推导所有新界面的全局规则。

