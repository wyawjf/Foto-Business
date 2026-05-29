import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, 
  Undo2, 
  Redo2, 
  Download, 
  Upload, 
  Share2, 
  RefreshCw, 
  Eye, 
  EyeOff, 
  Plus, 
  Sliders, 
  Check, 
  Grid, 
  Image as ImageIcon, 
  Tag, 
  X, 
  ArrowRight, 
  Heart, 
  Copy, 
  RotateCcw, 
  Languages,
  Compass,
  SlidersHorizontal,
  FolderOpen,
  CornerDownRight,
  ChevronRight,
  Shield,
  HelpCircle,
  Menu,
  CheckCircle2,
  History,
  Star,
  Sparkles,
  Palette,
  Type,
  Bookmark,
  Columns,
  User,
  Zap,
  TrendingUp,
  ArrowUpRight,
  Flame,
  ArrowLeft,
  ArrowUp,
  Users,
  Wand2,
  UserPlus,
  MessageSquarePlus,
  Info,
  Camera,
  Home
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { gsap } from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

// --- Types & Interfaces ---
interface Annotation {
  id: string;
  x: number; // percentage
  y: number; // percentage
  label: string;
  label_en?: string;
  label_zh?: string;
  author: string;
  avatarUrl: string;
  status: 'pending' | 'completed' | 'generating';
  timestamp: string;
  timestamp_en?: string;
  timestamp_zh?: string;
  category: string;
  category_en?: string;
  category_zh?: string;
}

interface HistoryVersion {
  id: string;
  image: string;
  title: string;
  title_en: string;
  promptApplied?: string;
  timestamp: string;
  annotations: Annotation[];
}

interface ImageState {
  id: string;
  name: string;
  chineseName: string;
  description: string;
  description_en?: string;
  description_zh?: string;
  category: string;
  subcategory?: string;
  author: string;
  avatarUrl: string;
  originalImage: string;
  styleVariants: {
    original: string;
    variantB: string;
    variantC: string;
  };
  promptSuggestions: string[];
  promptSuggestions_zh?: string[];
  promptSuggestions_en?: string[];
  defaultAnnotations: Annotation[];
  isUserTemplate?: boolean;
}

interface WorkflowStyleOption {
  id: string;
  name: string;
  name_zh: string;
  description: string;
  description_zh: string;
  prompt: string;
  prompt_zh: string;
  thumbnail: string;
  accent: string;
}

// Workflow ids that use the two-image upload flow in the remix entry page (everything else is single-image).
const REMIX_DUAL_IDS = new Set<string>([]);

// Workflow ids that use a single upload plus selectable AI style workflows.
const REMIX_STYLE_PICKER_IDS = new Set<string>(['cosmetic']);

// Workflow ids that open the Model Try-On studio (product upload + selectable model source).
const REMIX_TRYON_IDS = new Set<string>(['luxury_bag']);

// Curated system models offered in the Model Try-On flow.
const SYSTEM_MODELS = [
  { id: 'sys_aria', name_zh: '都市冷调', name_en: 'Urban Cool', thumbnail: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?q=80&w=400&auto=format&fit=crop' },
  { id: 'sys_mira', name_zh: '暖阳自然', name_en: 'Sunlit Natural', thumbnail: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=400&auto=format&fit=crop' },
  { id: 'sys_lena', name_zh: '高定杂志', name_en: 'Editorial', thumbnail: 'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?q=80&w=400&auto=format&fit=crop' },
  { id: 'sys_noah', name_zh: '绅士格调', name_en: 'Gentleman', thumbnail: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=400&auto=format&fit=crop' },
  { id: 'sys_kai', name_zh: '街头风格', name_en: 'Streetwear', thumbnail: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=400&auto=format&fit=crop' },
];

// Virtual-model attribute options.
const VM_GENDERS = [
  { id: 'female', zh: '女性', en: 'Female' },
  { id: 'male', zh: '男性', en: 'Male' },
];
const VM_AGES = [
  { id: 'youth', zh: '青少年', en: 'Teen' },
  { id: 'adult', zh: '青年', en: 'Young' },
  { id: 'mature', zh: '成熟', en: 'Mature' },
  { id: 'senior', zh: '年长', en: 'Senior' },
];
const VM_ETHNICITIES = [
  { id: 'asian', zh: '亚洲', en: 'Asian' },
  { id: 'caucasian', zh: '欧美', en: 'Caucasian' },
  { id: 'african', zh: '非裔', en: 'African' },
  { id: 'latino', zh: '拉丁裔', en: 'Latino' },
  { id: 'middle_eastern', zh: '中东', en: 'Middle Eastern' },
];

const WORKFLOW_STYLE_OPTIONS: WorkflowStyleOption[] = [
  {
    id: 'gallery_luxury',
    name: 'Luxury Gallery',
    name_zh: '高奢画廊',
    description: 'Travertine showroom, controlled shadows, premium catalog finish.',
    description_zh: '罗马洞石展厅、克制阴影、高级产品目录质感。',
    prompt: 'Place the product inside a minimalist travertine gallery with controlled luxury lighting.',
    prompt_zh: '将商品置入极简罗马洞石画廊，使用克制的高级棚拍光影。',
    thumbnail: 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?q=80&w=600&auto=format&fit=crop',
    accent: '#0e7a86'
  },
  {
    id: 'chrome_future',
    name: 'Liquid Chrome',
    name_zh: '液态镀铬',
    description: 'Reflective metal, holographic highlights, futuristic commercial shot.',
    description_zh: '反光金属、全息高光、未来感商业视觉。',
    prompt: 'Transform the image into a futuristic liquid chrome campaign with holographic reflections.',
    prompt_zh: '转为液态镀铬未来广告大片，加入全息反射与冷调高光。',
    thumbnail: 'https://images.unsplash.com/photo-1618005198919-d3d4b5a92ead?q=80&w=600&auto=format&fit=crop',
    accent: '#64748b'
  },
  {
    id: 'warm_sun',
    name: 'Warm Sun Studio',
    name_zh: '暖阳棚拍',
    description: 'Golden daylight, soft skin-care shadows, clean ecommerce warmth.',
    description_zh: '金色日光、柔和护肤品阴影、干净温暖的电商氛围。',
    prompt: 'Use warm daylight and soft skincare shadows for a clean ecommerce product image.',
    prompt_zh: '使用暖调自然日光和柔和护肤品阴影，生成干净电商商品图。',
    thumbnail: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=600&auto=format&fit=crop',
    accent: '#f59e0b'
  },
  {
    id: 'magazine_minimal',
    name: 'Magazine Minimal',
    name_zh: '杂志极简',
    description: 'Editorial spacing, matte backdrop, sharp premium typography mood.',
    description_zh: '杂志式留白、哑光背景、利落高级的版面情绪。',
    prompt: 'Recompose as a minimal editorial magazine product still with refined negative space.',
    prompt_zh: '重构为极简杂志商品静物大片，保留高级留白和干净构图。',
    thumbnail: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=600&auto=format&fit=crop',
    accent: '#111827'
  },
  {
    id: 'botanical_fresh',
    name: 'Botanical Fresh',
    name_zh: '自然植萃',
    description: 'Botanical accents, fresh mist, clean wellness product atmosphere.',
    description_zh: '植萃元素、清透水雾、自然健康的产品氛围。',
    prompt: 'Add a refined botanical wellness setting with fresh mist and clean natural highlights.',
    prompt_zh: '加入精致植萃健康场景、清透水雾和自然干净高光。',
    thumbnail: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=600&auto=format&fit=crop',
    accent: '#16a34a'
  },
  {
    id: 'glacier_clean',
    name: 'Glacier Clean',
    name_zh: '冰川冷光',
    description: 'Cool blue highlights, translucent base, crisp premium skincare mood.',
    description_zh: '冷蓝高光、透明冰感底座、清冽高级的护肤视觉。',
    prompt: 'Create a crisp glacier-clean skincare render with cool blue highlights and translucent textures.',
    prompt_zh: '生成清冽冰川冷光护肤图，加入冷蓝高光和透明质感。',
    thumbnail: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=600&auto=format&fit=crop',
    accent: '#0ea5e9'
  }
];

// --- Curated Premium Templates Catalog ---
const INITIAL_TEMPLATES: ImageState[] = [
  {
    id: 'sneaker',
    name: 'Aether Apex Running Shoe',
    chineseName: 'Aether 极境先锋概念慢跑鞋',
    description: 'Levitating hyper-textured architectural athletic canvas constructed with pristine breathable weave.',
    description_en: 'Levitating hyper-textured architectural athletic canvas constructed with pristine breathable weave.',
    description_zh: '悬浮于旷野戈壁之上的高奢太空梭形慢跑鞋，流露极致张力与纯粹工业形态。',
    category: 'ecommerce',
    subcategory: 'shoes_bags',
    author: '@atelier_alpha',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '重构背景为米色极简沙漠戈壁',
      '将表面材质换成交织全息反光皮革',
      '在左下角投射温暖的高级晨曦束光',
      '去除鞋头与鞋舌多余的反光杂斑'
    ],
    promptSuggestions_zh: [
      '重构背景为米色极简沙漠戈壁',
      '将表面材质换成交织全息反光皮革',
      '在左下角投射温暖的高级晨曦束光',
      '去除鞋头与鞋舌多余的反光杂斑'
    ],
    promptSuggestions_en: [
      'Re-engineer backdrop into minimalist warm beige desert',
      'Transform mesh fabric into premium holographic woven leather',
      'Diffuse organic golden morning glow in bottom-left corner',
      'Erase minor reflective specks on the toe box'
    ],
    defaultAnnotations: [
      {
        id: 'ann-1',
        x: 48,
        y: 42,
        label: '将这层网眼织物重塑为全息涂层的反光皮面，接缝边缘点缀细致金边。',
        label_zh: '将这层网眼织物重塑为全息涂层的反光皮面，接缝边缘点缀细致金边。',
        label_en: 'Morph this mesh weave into structured holographic coated leather with subtle golden seams.',
        author: '@atelier_alpha',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
        status: 'completed',
        timestamp: '15分钟前',
        timestamp_zh: '15分钟前',
        timestamp_en: '15 min ago',
        category: 'Material Synthesis',
        category_zh: '材质解构',
        category_en: 'Material Synthesis'
      },
      {
        id: 'ann-2',
        x: 25,
        y: 85,
        label: '背景移除，换成一块具有风雕纹理的粗砺黑火山岩台座，烘托强烈反差。',
        label_zh: '背景移除，换成一块具有风雕纹理的粗砺黑火山岩台座，烘托强烈反差。',
        label_en: 'Strip background, mounting the shoe on a rugged, micro-focus obsidian rock pedestal.',
        author: 'Erich S.',
        avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
        status: 'completed',
        timestamp: '1小时前',
        timestamp_zh: '1小时前',
        timestamp_en: '1 hour ago',
        category: 'Atelier Set',
        category_zh: '空间置景',
        category_en: 'Atelier Set'
      }
    ]
  },
  {
    id: 'luxury_bag',
    name: 'Aurelia Amber Leather Tote',
    chineseName: 'Aurelia 琥珀臻金手提拼皮包',
    description: 'Luxury polished saddle leather tote with gold buckle highlights over minimalist museum travertine plate.',
    description_en: 'Luxury polished saddle leather tote with gold buckle highlights over minimalist museum travertine plate.',
    description_zh: '重金手工抛光马鞍皮拼皮包，金扣流光璀璨，静置于美术馆米黄洞石板上。',
    category: 'ecommerce',
    subcategory: 'shoes_bags',
    author: '@luxury_curator',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '将金属拉链与带扣部分强化拉丝亮金色材质反射',
      '在右后侧透出柔和、高对比度的拱门阴影',
      '将底座转换为深棕色黑胡桃原木托盘'
    ],
    promptSuggestions_zh: [
      '将金属拉链与带扣部分强化拉丝亮金色材质反射',
      '在右后侧透出柔和、高对比度的拱门阴影',
      '将底座转换为深棕色黑胡桃原木托盘'
    ],
    promptSuggestions_en: [
      'Enhance bronze hardware with high-brushed yellow gold luster',
      'Introduce romantic arch outline casting shadow patterns from right',
      'Change display base to dark brown oiled American walnut tray'
    ],
    defaultAnnotations: [
      {
        id: 'ann-bag-1',
        x: 52,
        y: 65,
        label: '皮质接缝部分追加手工双骨车线，突出重工业精细奢华感。',
        label_zh: '皮质接缝部分追加手工双骨车线，突出重工业精细奢华感。',
        label_en: 'Add dual-stitch heavy thread detailing along the leather lining seams.',
        author: '@luxury_curator',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
        status: 'completed',
        timestamp: '3小时前',
        timestamp_zh: '3小时前',
        timestamp_en: '3 hours ago',
        category: 'Micro Detail',
        category_zh: '微距点缀',
        category_en: 'Micro Detail'
      }
    ]
  },
  {
    id: 'cosmetic',
    name: 'Multi-Style Product Transformer',
    chineseName: '单图多风格商品图变换器',
    description: 'Upload one product image, then choose from multiple AI workflow styles for fast visual variation.',
    description_en: 'Upload one product image, then choose from multiple AI workflow styles for fast visual variation.',
    description_zh: '上传一张商品图片后，可在多种内置 AI 风格工作流中选择并生成不同视觉方向。',
    category: 'ecommerce',
    subcategory: 'beauty',
    author: '@minimal_lens',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '上传一张商品图作为主体',
      '从多种 AI 风格模板中选择方向',
      '直接生成后可下载或重新生成'
    ],
    promptSuggestions_zh: [
      '上传一张商品图作为主体',
      '从多种 AI 风格模板中选择方向',
      '直接生成后可下载或重新生成'
    ],
    promptSuggestions_en: [
      'Upload one product image as the subject',
      'Choose from multiple AI style workflow presets',
      'Generate directly, then download or regenerate'
    ],
    defaultAnnotations: [
      {
        id: 'ann-4',
        x: 52,
        y: 35,
        label: '在磨砂瓶身处凝聚约十余颗剔透的物理真实晨露，折射高强度侧逆光隙。',
        label_zh: '在磨砂瓶身处凝聚约十余颗剔透的物理真实晨露，折射高强度侧逆光隙。',
        label_en: 'Drizzle a few crisp dew condensation drops onto the frosted tube, scattering highlights.',
        author: '@minimal_lens',
        avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
        status: 'completed',
        timestamp: '30分钟前',
        timestamp_zh: '30分钟前',
        timestamp_en: '30 min ago',
        category: 'Micro Detail',
        category_zh: '微距点缀',
        category_en: 'Micro Detail'
      }
    ]
  },
  {
    id: 'cosmetic_serum',
    name: 'Atelier Amber Radiant Serum',
    chineseName: '琥珀沁润修护滴管原液',
    description: 'Double-walled amber glass dropper bottle centered with sharp luxury shadows, resting on micro-sandstone base.',
    description_en: 'Double-walled amber glass dropper bottle centered with sharp luxury shadows, resting on micro-sandstone base.',
    description_zh: '流光半透的深透棕琥珀精油滴管，精巧站立在颗粒风干岩石柱之上，四周光芒收敛敛。',
    category: 'ecommerce',
    subcategory: 'beauty',
    author: '@minimal_lens',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1601049541289-9b1b7bbbfe19?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '增加高定玻璃的液体漫反射琥珀余辉',
      '重绘背景氛围为晨曦初泛的森林朝雾空间'
    ],
    promptSuggestions_zh: [
      '增加高定玻璃的液体漫反射琥珀余辉',
      '重绘背景氛围为晨曦初泛的森林朝雾空间'
    ],
    promptSuggestions_en: [
      'Enrich diffuse amber sub-surface scattering glow in bottle fluid',
      'Reposition background with soft ethereal pine forest morning mist'
    ],
    defaultAnnotations: []
  },
  {
    id: 'headphones',
    name: 'Sensa Slate Matte Headphones',
    chineseName: 'Sensa 曜石磨砂全息降噪耳机',
    description: 'Over-ear studio grade wireless headphones rendered with absolute obsidian matte and precision steel textures.',
    description_en: 'Over-ear studio grade wireless headphones rendered with absolute obsidian matte and precision steel textures.',
    description_zh: '工业级哑光炭黑全罩式耳麦，质感高贵，静立在拉丝深色铝合金桌面陈列台。',
    category: 'ecommerce',
    subcategory: 'digital',
    author: '@sound_architect',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '更换耳罩连接部分为阳极氧化红铜拉丝金属材质',
      '注入一缕动感电波霓虹线圈在背景四周'
    ],
    promptSuggestions_zh: [
      '更换耳罩连接部分为阳极氧化红铜拉丝金属材质',
      '注入一缕动感电波霓虹线圈在背景四周'
    ],
    promptSuggestions_en: [
      'Change structural hinges into brushed anodized copper metalwork',
      'Emanate organic circular cyber neon soundwave rings on background'
    ],
    defaultAnnotations: []
  },
  {
    id: 'gold_ring',
    name: 'Solitaire Aurum Diamond Ring',
    chineseName: 'Solitaire 极光流金独白钻戒',
    description: 'High jewelry 24k polished gold band reflecting immaculate multi-faceted diamond glow against warm marble slab.',
    description_en: 'High jewelry 24k polished gold band reflecting immaculate multi-faceted diamond glow against warm marble slab.',
    description_zh: '殿堂级24K流沙金极光单瓣钻戒，流光交映，折射出璀璨的多棱切面星芒。',
    category: 'ecommerce',
    subcategory: 'jewelry',
    author: '@luxury_curator',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '极大化钻石切面的全彩漫射彩虹光散景',
      '更换底板为一整块极细腻的皇家黑丝绒布'
    ],
    promptSuggestions_zh: [
      '极大化钻石切面的全彩漫射彩虹光散景',
      '更换底板为一整块极细腻的皇家黑丝绒布'
    ],
    promptSuggestions_en: [
      'Maximize diamond refraction dispersion spectrum with rainbow lens flares',
      'Change foundation to ultra-dense royal black velvet cloth fabric'
    ],
    defaultAnnotations: []
  },
  {
    id: 'jacket',
    name: 'Structured Trench Silhouette',
    chineseName: '双排扣极简解构拼接大衣',
    description: 'Sartorial heavy linen outerwear photographed against micro-texture travertine plaster walls.',
    description_en: 'Sartorial heavy linen outerwear photographed against micro-texture travertine plaster walls.',
    description_zh: '重磅考究的双排扣拼接立体裁剪大衣，捕捉宁静、高对比的书写流线。',
    category: 'fashion',
    subcategory: 'coats',
    author: '@luna_studio',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '袖口材质换成重磅纯黑色缎面真丝',
      '将背景置换为雨夜霓虹折射的银座街头',
      '从右方打入一束柔和的冷光射灯',
      '精细修护模特的面部阴影分布'
    ],
    promptSuggestions_zh: [
      '袖口材质换成重磅纯黑色缎面真丝',
      '将背景置换为雨夜霓虹折射的银座街头',
      '从右方打入一束柔和的冷光射灯',
      '精细修护模特的面部阴影分布'
    ],
    promptSuggestions_en: [
      'Replace sleeves with heavyweight luxury black silk satin',
      'Swap background to rainy Tokyo night streets with cool indigo glow',
      'Cast a soft laboratory spotlight from the far right',
      'Gracefully balacing portrait facial illumination structure'
    ],
    defaultAnnotations: [
      {
        id: 'ann-3',
        x: 45,
        y: 60,
        label: '大衣左幅拼接部分更换为磨砂感极好的精纺重磅黑色丝绒。',
        label_zh: '大衣左幅拼接部分更换为磨砂感极好的精纺重磅黑色丝绒。',
        label_en: 'Convert the left drape panel into high-density luxurious obsidian silk-velvet texture.',
        author: '@luna_studio',
        avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
        status: 'completed',
        timestamp: '5分钟前',
        timestamp_zh: '5分钟前',
        timestamp_en: '5 min ago',
        category: 'Material Synthesis',
        category_zh: '材质解构',
        category_en: 'Material Synthesis'
      }
    ]
  },
  {
    id: 'runway_gown',
    name: 'Avant-garde Cyberpunk Draped Gown',
    chineseName: '霓虹赛博先锋高奢晚礼装',
    description: 'Deconstructed asymmetric liquid satin dress on model inside a misty purple neo-tokyo cyberpunk virtual runway setting.',
    description_en: 'Deconstructed asymmetric liquid satin dress on model inside a misty purple neo-tokyo cyberpunk virtual runway setting.',
    description_zh: '不对称解构主义的流体液态真丝裙摆，处于氤氲紫色霓虹交映的赛博东京虚拟秀场中。',
    category: 'fashion',
    subcategory: 'runway',
    author: '@erich_vanguard',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=80&h=80&q=80',
    originalImage: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '追加全息变色高分子亮银涂层材质',
      '加强面部受左侧霓红灯板影响的边缘漫反射'
    ],
    promptSuggestions_zh: [
      '追加全息变色高分子亮银涂层材质',
      '加强面部受左侧霓红灯板影响的边缘漫反射'
    ],
    promptSuggestions_en: [
      'Inject high-gloss holographic iridescent polymer coating over yarn drapes',
      'Optimize portrait jaw-line rim light bounced from neon fixtures'
    ],
    defaultAnnotations: []
  },
  {
    id: 'sculpture_temple',
    name: 'Alabaster Classical Temple Scene',
    chineseName: '羊脂玉石古典神明殿堂置景',
    description: 'Chamber exhibition setup showing pure white marble Greek statue and columns over minimalist modern travertine floor with soft warm sun rays.',
    description_en: 'Chamber exhibition setup showing pure white marble Greek statue and columns over minimalist modern travertine floor with soft warm sun rays.',
    description_zh: '汉白玉希腊雕塑残件与古典罗马石柱，静置于具有几何雕刻感的米黄砂岩板上，一缕温暖的斜晖打在雕饰轮廓。',
    category: 'space',
    subcategory: 'alabaster',
    author: '@atelier_alpha',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '在右背景增设古典落地高窗拱廊',
      '渲染清晨淡淡缭绕其间的圣洁梵音朝烟'
    ],
    promptSuggestions_zh: [
      '在右背景增设古典落地高窗拱廊',
      '渲染清晨淡淡缭绕其间的圣洁梵音朝烟'
    ],
    promptSuggestions_en: [
      'Incorporate a row of elegant architectural arches in background',
      'Formulate organic soft morning incense smoke curling in air'
    ],
    defaultAnnotations: []
  },
  {
    id: 'travertine_gallery',
    name: 'Travertine Arches Exhibition Haven',
    chineseName: '落日罗马洞石美术馆连拱置景',
    description: 'High ceiling travertine plastered gallery with open warm sunlight slicing through monumental arches onto clean ground catalog plates.',
    description_en: 'High ceiling travertine plastered gallery with open warm sunlight slicing through monumental arches onto clean ground catalog plates.',
    description_zh: '落日余晖斜切入巨大的罗马洞石连拱长廊，在温良如玉的石膏地面投影出壮阔的时空景深。',
    category: 'space',
    subcategory: 'travertine',
    author: '@luna_studio',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '精绘地表的大理石斑驳自然龟裂纹路',
      '增加空气中的莫奈画意金色尘埃漂浮散射'
    ],
    promptSuggestions_zh: [
      '精绘地表的大理石斑驳自然龟裂纹路',
      '增加空气中的莫奈画意金色尘埃漂浮散射'
    ],
    promptSuggestions_en: [
      'Refine micro fissures and stone texturing detailed on marble floor',
      'Inject shimmering golden air dust particles catching the direct sun rays'
    ],
    defaultAnnotations: []
  },
  {
    id: 'fluid_chrome',
    name: 'Iridescent Holographic Liquid Sphere',
    chineseName: '极光流转液态全息流体母球',
    description: '3D floating chrome polymer amorphous sphere refracting mesmerizing high saturation violet and cyan iridescent studio lights.',
    description_en: '3D floating chrome polymer amorphous sphere refracting mesmerizing high saturation violet and cyan iridescent studio lights.',
    description_zh: '悬浮于微暗真空的一团柔顺液态全息高亮水银母球，体表流转变幻万千，折射出深邃的极光电荷光影。',
    category: 'creative',
    subcategory: 'fluid',
    author: '@sound_architect',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=100&h=100&q=80',
    originalImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
    styleVariants: {
      original: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1000&auto=format&fit=crop',
      variantB: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1000&auto=format&fit=crop',
      variantC: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=1000&auto=format&fit=crop',
    },
    promptSuggestions: [
      '使全息流体表面如风雕水面般荡起密集微型涟漪',
      '在球体内透射出一团幽冷荧光放射核心'
    ],
    promptSuggestions_zh: [
      '使全息流体表面如风雕水面般荡起密集微型涟漪',
      '在球体内透射出一团幽冷荧光放射核心'
    ],
    promptSuggestions_en: [
      'Introduce micro fluidic water ripples texturing fluid metallic surface',
      'Emanate a moody bioluminescent radioactive pulse core inside sphere entity'
    ],
    defaultAnnotations: []
  }
];

const CATEGORY_MAP = [
  {
    id: 'ecommerce',
    name_zh: '产品电商',
    name_en: 'Product E-commerce',
    subcategories: [
      { id: 'shoes_bags', name_zh: '鞋履箱包', name_en: 'Footwear & Bags' },
      { id: 'beauty', name_zh: '美妆个护', name_en: 'Beauty & Skincare' },
      { id: 'digital', name_zh: '智能数码', name_en: 'Digital Electronics' },
      { id: 'jewelry', name_zh: '珠宝首饰', name_en: 'Jewelry & Accessories' },
    ]
  },
  {
    id: 'fashion',
    name_zh: '时装人像',
    name_en: 'Fashion & Portrait',
    subcategories: [
      { id: 'coats', name_zh: '极简风衣', name_en: 'Minimalist Coats' },
      { id: 'runway', name_zh: '秀场先锋', name_en: 'Avant-garde Runway' },
      { id: 'studio', name_zh: '质感棚拍', name_en: 'Studio Portraiture' },
      { id: 'street', name_zh: '日常街拍', name_en: 'Lifestyle Streetwear' },
    ]
  },
  {
    id: 'space',
    name_zh: '空间置景',
    name_en: 'Space & Scene',
    subcategories: [
      { id: 'alabaster', name_zh: '汉白玉石殿堂', name_en: 'Alabaster Museum' },
      { id: 'travertine', name_zh: '罗马洞石画廊', name_en: 'Travertine Gallery' },
    ]
  },
  {
    id: 'creative',
    name_zh: '创意艺术',
    name_en: 'Creative & Abstract',
    subcategories: [
      { id: 'fluid', name_zh: '液态全息流体', name_en: 'Fluid & Holographic' },
    ]
  }
];



export default function App() {
  // --- Core Layout & Views ---
  const [activeTab, setActiveTab] = useState<'quickstart' | 'templates' | 'sandbox' | 'profile' | 'remix'>('quickstart');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  
  // Sidebars Toggle for pure monolithic editing workspace focus
  const [leftSidebarOpen, setLeftSidebarOpen] = useState<boolean>(true);
  const [leftSidebarTab, setLeftSidebarTab] = useState<'presets' | 'brand'>('presets');
  const [rightSidebarOpen, setRightSidebarOpen] = useState<boolean>(true);

  // Creative interactive upload element hover state
  const [isUploadHovered, setIsUploadHovered] = useState<boolean>(false);

  // Left sidebar menu hover state for responsive expansion
  const [isSidebarHovered, setIsSidebarHovered] = useState<boolean>(false);

  // --- GSAP: layered choreography for the left navigation dock ---
  const sidebarRef = useRef<HTMLElement>(null);
  const sidebarInitRef = useRef<boolean>(false);
  const sidebarTlRef = useRef<gsap.core.Timeline | null>(null);
  const sidebarOpenRef = useRef<boolean>(false);

  // --- GSAP: brief, smooth enter transition when switching main views ---
  const mainViewRef = useRef<HTMLElement>(null);
  // Assets Plaza redesign: entrance choreography + spotlight pointer parallax.
  const templatesRef = useRef<HTMLDivElement>(null);

  // Navigation and Sub-tab views configuration
  
  const [profileSubTab, setProfileSubTab] = useState<'favs' | 'settings'>('favs');

  // User Login States
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [userLoggedIn, setUserLoggedIn] = useState<boolean>(false);
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('Guest Creator');

  useGSAP(() => {
    const open = isSidebarHovered;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // First paint snaps to the resting state with no animation.
    const instant = !sidebarInitRef.current || reduce;
    // A re-run not driven by a hover change (e.g. login swaps the footer item)
    // should snap to the resting state rather than replay the choreography.
    const hoverChanged = sidebarOpenRef.current !== open;
    sidebarInitRef.current = true;
    sidebarOpenRef.current = open;

    const items = gsap.utils.toArray<HTMLElement>('.sb-expandable');
    const labels = gsap.utils.toArray<HTMLElement>('.sb-label');

    // Re-choreograph from current values: kill the in-flight timeline so an
    // interrupted expand/collapse reverses smoothly from wherever it is.
    sidebarTlRef.current?.kill();

    if (instant || !hoverChanged) {
      gsap.set(sidebarRef.current, { width: open ? 236 : 92 });
      items.forEach((el) => {
        const pad = open ? el.dataset.padX : el.dataset.collapsedPad;
        gsap.set(el, {
          width: open ? el.dataset.expandedW : el.dataset.collapsedW,
          paddingLeft: pad,
          paddingRight: pad,
        });
      });
      gsap.set(labels, { autoAlpha: open ? 1 : 0, x: open ? 0 : -10 });
      return;
    }

    const ease = 'power3.out';
    const tl = gsap.timeline();
    sidebarTlRef.current = tl;

    if (open) {
      // Expand: the dock widens first, then labels fade + slide in just behind.
      tl.to(sidebarRef.current, { width: 236, duration: 0.46, ease });
      items.forEach((el) => {
        tl.to(el, {
          width: el.dataset.expandedW,
          paddingLeft: el.dataset.padX,
          paddingRight: el.dataset.padX,
          duration: 0.46,
          ease,
        }, '<');
      });
      tl.to(labels, {
        autoAlpha: 1,
        x: 0,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.04,
      }, '<0.12');
    } else {
      // Collapse: labels fade out first, then the dock contracts behind them.
      tl.to(labels, {
        autoAlpha: 0,
        x: -10,
        duration: 0.26,
        ease: 'power2.in',
        stagger: { each: 0.03, from: 'end' },
      });
      tl.to(sidebarRef.current, { width: 92, duration: 0.44, ease }, '<0.1');
      items.forEach((el) => {
        tl.to(el, {
          width: el.dataset.collapsedW,
          paddingLeft: el.dataset.collapsedPad,
          paddingRight: el.dataset.collapsedPad,
          duration: 0.44,
          ease,
        }, '<');
      });
    }
  }, { scope: sidebarRef, dependencies: [isSidebarHovered, userLoggedIn] });

  useGSAP(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !mainViewRef.current) return;
    gsap.fromTo(mainViewRef.current,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.32, ease: 'power2.out', overwrite: 'auto' }
    );
  }, { dependencies: [activeTab] });

  // Assets Plaza: spotlight entrance + pointer-reactive parallax (bound on enter).
  useGSAP((_ctx, contextSafe) => {
    if (activeTab !== 'templates' || !templatesRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    gsap.fromTo('.ap-enter',
      { autoAlpha: 0, y: 18 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08, overwrite: 'auto' }
    );

    const hero = templatesRef.current.querySelector<HTMLElement>('.ap-hero');
    const img = hero?.querySelector<HTMLElement>('.ap-hero-img');
    if (!hero || !img || !contextSafe) return;

    const onMove = contextSafe((e: MouseEvent) => {
      const r = hero.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(img, { xPercent: px * -5, yPercent: py * -5, duration: 0.7, ease: 'power2.out' });
    });
    const onLeave = contextSafe(() => {
      gsap.to(img, { xPercent: 0, yPercent: 0, duration: 0.9, ease: 'power3.out' });
    });
    hero.addEventListener('mousemove', onMove);
    hero.addEventListener('mouseleave', onLeave);
    return () => {
      hero.removeEventListener('mousemove', onMove);
      hero.removeEventListener('mouseleave', onLeave);
    };
  }, { scope: templatesRef, dependencies: [activeTab] });

  // --- Login modal: GSAP entrance + mock auth ---
  const loginCardRef = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!showLoginModal) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap.fromTo('.login-anim',
      { opacity: 0, y: reduce ? 0 : 18 },
      {
        opacity: 1,
        y: 0,
        duration: reduce ? 0 : 0.55,
        ease: 'power3.out',
        stagger: reduce ? 0 : 0.07,
        delay: reduce ? 0 : 0.1,
        overwrite: 'auto',
      }
    );
  }, { scope: loginCardRef, dependencies: [showLoginModal] });

  const completeLogin = (name: string, msg: string) => {
    setUserLoggedIn(true);
    setUsername(name);
    setShowLoginModal(false);
    setLoginEmail('');
    setLoginPassword('');
    triggerToast(msg, 'success');
  };

  // --- Templates & Sandbox State ---
  const [templates, setTemplates] = useState<ImageState[]>(() => {
    try {
      const saved = localStorage.getItem('foto_user_templates_v2');
      if (saved) {
        const userSaved: ImageState[] = JSON.parse(saved);
        return [...userSaved, ...INITIAL_TEMPLATES];
      }
    } catch (e) {}
    return INITIAL_TEMPLATES;
  });

  // Synchronize and write user templates to browser cache
  useEffect(() => {
    try {
      const userSavedList = templates.filter(t => t.isUserTemplate);
      localStorage.setItem('foto_user_templates_v2', JSON.stringify(userSavedList));
    } catch (e) {}
  }, [templates]);

  const [activeTemplateIndex, setActiveTemplateIndex] = useState<number>(0);
  const activeTemplate = templates[activeTemplateIndex] || templates[0] || INITIAL_TEMPLATES[0];

  // Image history stack for Sandbox
  const [currentImage, setCurrentImage] = useState<string>(activeTemplate.styleVariants.original);
  const [imageHistory, setImageHistory] = useState<string[]>([activeTemplate.styleVariants.original]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Pin annotations
  const [annotations, setAnnotations] = useState<Annotation[]>(activeTemplate.defaultAnnotations);
  const [showAnnotations, setShowAnnotations] = useState<boolean>(true);
  const [activeAnnotationId, setActiveAnnotationId] = useState<string | null>(null);

  // New Node placement (temporary click coordinates)
  const [tempCoordinate, setTempCoordinate] = useState<{ x: number; y: number } | null>(null);
  const [newAnnotationText, setNewAnnotationText] = useState<string>('');
  const [newAnnotationCategory, setNewAnnotationCategory] = useState<string>('Material Synthesis');

  // Multi-Step Procedural Atelier Refinement Simulation
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStepProgress, setGenerationStepProgress] = useState<number>(0);
  const [generationStepLabel, setGenerationStepLabel] = useState<string>('');

  // Canvas Viewport Adjustments
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [aspectRatio, setAspectRatio] = useState<string>('original');
  const [imageAspectRatio, setImageAspectRatio] = useState<number>(1);

  useEffect(() => {
    if (!currentImage) return;
    const img = new Image();
    img.src = currentImage;
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setImageAspectRatio(img.naturalWidth / img.naturalHeight);
      }
    };
  }, [currentImage]);

  const [stylePreset, setStylePreset] = useState<string>('Studio Ambient');
  const [creativeSlider, setCreativeSlider] = useState<number>(75);

  // Before & After comparison slider
  const [sliderSplit, setSliderSplit] = useState<boolean>(false);
  const [beforeAfterSplitValue, setBeforeAfterSplitValue] = useState<number>(50);
  const splitContainerRef = useRef<HTMLDivElement>(null);

  // Notification Toast state
  const [toast, setToast] = useState<{ show: boolean; text: string; type: 'success' | 'info' | 'error' }>({
    show: false,
    text: '',
    type: 'success'
  });

  // --- Version History States ---
  const [versionHistory, setVersionHistory] = useState<HistoryVersion[]>([
    {
      id: 'v-original',
      image: activeTemplate.styleVariants.original,
      title: '原始底片',
      title_en: 'Original Baseline',
      timestamp: new Date().toLocaleTimeString(),
      annotations: [...activeTemplate.defaultAnnotations]
    }
  ]);

  // --- Comparison View Modes ---
  const [dualCompareMode, setDualCompareMode] = useState<boolean>(false);

  // --- Annotation Filter State ---
  const [annotationFilter, setAnnotationFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // --- Brand Space States ---
  const [selectedBrandLogo, setSelectedBrandLogo] = useState<string | null>(null);
  const [logoPosition, setLogoPosition] = useState<'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'>('top-right');
  const [brandWatermarkText, setBrandWatermarkText] = useState<string>('');
  const [selectedBrandColor, setSelectedBrandColor] = useState<string>('#0e7a86');
  const [selectedBrandFont, setSelectedBrandFont] = useState<string>('Inter');

  // --- Favorites States ---
  const [favoriteTemplateIds, setFavoriteTemplateIds] = useState<string[]>(['sneaker']);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState<boolean>(false);

  // --- Batch Generation States ---
  const [showBatchModal, setShowBatchModal] = useState<boolean>(false);
  const [batchResults, setBatchResults] = useState<{ id: string; name: string; name_zh: string; image: string; style: string; style_zh: string }[]>([]);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);

  // --- Model Preset States ---
  const [modelAge, setModelAge] = useState<'infant' | 'youth' | 'adult' | 'elderly'>('adult');
  const [modelGender, setModelGender] = useState<'female' | 'male'>('female');
  const [activeQuickAction, setActiveQuickAction] = useState<'none' | 'model'>('none');

  // --- User-Archived Templates States ---
  const [presetScope, setPresetScope] = useState<'all' | 'official' | 'user'>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');
  const [selectedSubcategoryFilter, setSelectedSubcategoryFilter] = useState<string>('all');

  // --- Assets Plaza spotlight carousel ---
  const [heroSlide, setHeroSlide] = useState<number>(0);
  const [isHeroHovered, setIsHeroHovered] = useState<boolean>(false);

  // Diverse, de-duplicated picks across categories for the spotlight carousel.
  const heroSlides = (() => {
    const real = templates.filter((t) => !t.isUserTemplate);
    const picks = [
      real.find((t) => t.subcategory === 'fluid'),
      real.find((t) => t.category === 'fashion'),
      real.find((t) => t.category === 'ecommerce'),
      real.find((t) => t.category === 'space'),
    ].filter((t): t is ImageState => Boolean(t));
    const unique = Array.from(new Map(picks.map((t) => [t.id, t])).values());
    return unique.length >= 2 ? unique : real.slice(0, 4);
  })();

  // Auto-advance the spotlight; pauses on hover and respects reduced-motion.
  useEffect(() => {
    if (activeTab !== 'templates' || isHeroHovered || heroSlides.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = window.setInterval(() => {
      setHeroSlide((s) => (s + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, [activeTab, isHeroHovered, heroSlides.length]);

  // Crossfade + ken-burns when the active slide changes (not on first reveal).
  useGSAP(() => {
    if (activeTab !== 'templates' || !templatesRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.ap-hero-img',
      { autoAlpha: 0.25, scale: 1.18 },
      { autoAlpha: 0.7, scale: 1.12, duration: 0.9, ease: 'power2.out', overwrite: 'auto' }
    );
    gsap.fromTo('.ap-hero-content',
      { autoAlpha: 0, y: 16 },
      { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', overwrite: 'auto' }
    );
  }, { scope: templatesRef, dependencies: [heroSlide] });

  // --- Workflow Remix entry page (upload-your-product) ---
  // Slot 0 = primary subject (product); slot 1 = secondary reference (style ref / garment); slot 2 = uploaded model.
  const [remixUploads, setRemixUploads] = useState<(string | null)[]>([null, null, null]);
  const [remixFiles, setRemixFiles] = useState<(File | null)[]>([null, null, null]);
  const [remixDragSlot, setRemixDragSlot] = useState<number | null>(null);
  const [selectedRemixStyleId, setSelectedRemixStyleId] = useState<string>(WORKFLOW_STYLE_OPTIONS[0].id);
  const [remixGeneratedImage, setRemixGeneratedImage] = useState<string | null>(null);
  const [remixIsGenerating, setRemixIsGenerating] = useState<boolean>(false);
  const [remixGenerationLabel, setRemixGenerationLabel] = useState<string>('');
  const [customCampaignMeta, setCustomCampaignMeta] = useState({
    productName: '',
    companyName: '',
    productPrice: '',
    notes: ''
  });
  const remixRef = useRef<HTMLDivElement>(null);
  const remixInputRef = useRef<HTMLInputElement>(null);
  const remixCameraInputRef = useRef<HTMLInputElement>(null);
  const remixPickSlotRef = useRef<number>(0);
  const [pickerSheetOpen, setPickerSheetOpen] = useState<boolean>(false);

  // Track viewport so uploads can offer camera capture on phones.
  const [isMobile, setIsMobile] = useState<boolean>(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // On phones the dense workbench side panels would overflow — keep the canvas full-width by default.
  useEffect(() => {
    setLeftSidebarOpen(!isMobile);
    setRightSidebarOpen(!isMobile);
  }, [isMobile]);

  const updateCustomCampaignMeta = (field: keyof typeof customCampaignMeta, value: string) => {
    setCustomCampaignMeta((prev) => ({ ...prev, [field]: value }));
  };

  // --- Model Try-On controls ---
  const [tryonSource, setTryonSource] = useState<'system' | 'virtual' | 'upload'>('system');
  const [tryonSystemModelId, setTryonSystemModelId] = useState<string>(SYSTEM_MODELS[0].id);
  const [vmGender, setVmGender] = useState<string>('female');
  const [vmAge, setVmAge] = useState<string>('adult');
  const [vmEthnicity, setVmEthnicity] = useState<string>('asian');
  const [tryonAutoMatch, setTryonAutoMatch] = useState<boolean>(true);
  const [tryonNote, setTryonNote] = useState<string>('');
  const [tryonProductError, setTryonProductError] = useState<boolean>(false);

  // Remix page: choreographed entrance + idle ken-burns + floating upload affordance.
  useGSAP(() => {
    if (activeTab !== 'remix' || !remixRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.rx-enter',
      { autoAlpha: 0, y: 22 },
      { autoAlpha: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.09, overwrite: 'auto' }
    );
    gsap.fromTo('.rx-hero-img',
      { scale: 1.16, autoAlpha: 0 },
      { scale: 1.08, autoAlpha: 0.8, duration: 1.1, ease: 'power2.out' }
    );
  }, { scope: remixRef, dependencies: [activeTab] });

  // Remix page: reveal the uploaded specimen.
  useGSAP(() => {
    if (activeTab !== 'remix' || !remixUploads.some(Boolean) || !remixRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.rx-preview',
      { autoAlpha: 0, scale: 1.05 },
      { autoAlpha: 1, scale: 1, duration: 0.55, ease: 'power3.out', overwrite: 'auto' }
    );
  }, { scope: remixRef, dependencies: [remixUploads] });

  // Remix style deck: image-tile reveal and selected-state pulse.
  useGSAP(() => {
    if (activeTab !== 'remix' || !REMIX_STYLE_PICKER_IDS.has(activeTemplate.id) || !remixRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.set('.rx-style-tile', { transformOrigin: '50% 70%' });
    gsap.fromTo('.rx-style-tile',
      { autoAlpha: 0, y: 18, scale: 0.9, rotation: -2 },
      { autoAlpha: 1, y: 0, scale: 1, rotation: 0, duration: 0.7, ease: 'power3.out', stagger: { amount: 0.3, from: 'center' }, overwrite: 'auto' }
    );
    gsap.fromTo('.rx-style-copy',
      { autoAlpha: 0, y: 10 },
      { autoAlpha: 1, y: 0, duration: 0.55, delay: 0.18, ease: 'power3.out', overwrite: 'auto' }
    );
  }, { scope: remixRef, dependencies: [activeTab, activeTemplate.id] });

  useGSAP(() => {
    if (activeTab !== 'remix' || !REMIX_STYLE_PICKER_IDS.has(activeTemplate.id) || !remixRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.rx-style-tile.is-active',
      { scale: 0.94, y: 4 },
      { scale: 1, y: 0, duration: 0.5, ease: 'back.out(1.8)', overwrite: 'auto' }
    );
    gsap.fromTo('.rx-style-selected',
      { autoAlpha: 0, scale: 0.45, rotation: -30 },
      { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.45, ease: 'back.out(2)', overwrite: 'auto' }
    );
  }, { scope: remixRef, dependencies: [selectedRemixStyleId, activeTab, activeTemplate.id] });

  // Model Try-On: crossfade the model-source panel whenever the source switches.
  useGSAP(() => {
    if (activeTab !== 'remix' || !REMIX_TRYON_IDS.has(activeTemplate.id) || !remixRef.current) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.fromTo('.tryon-panel-body',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.42, ease: 'power2.out', overwrite: 'auto' }
    );
  }, { scope: remixRef, dependencies: [tryonSource] });

  // Assets Plaza: re-stagger the workflow grid whenever the filter changes.
  useGSAP(() => {
    if (activeTab !== 'templates' || !templatesRef.current) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;
    gsap.fromTo('.ap-card',
      { autoAlpha: 0, y: 14 },
      { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05, overwrite: 'auto' }
    );
  }, { scope: templatesRef, dependencies: [activeTab, selectedCategoryFilter, selectedSubcategoryFilter] });
  const [newTemplateName, setNewTemplateName] = useState<string>('');
  const [templateSourceType, setTemplateSourceType] = useState<'current' | 'file'>('current');
  const [uploadedTemplateFile, setUploadedTemplateFile] = useState<string | null>(null);
  const [lastUploadedUserTemplate, setLastUploadedUserTemplate] = useState<any>(null);

  // --- Beautiful Upload Template Configuration Dialog States ---
  const [templateConfigModalOpen, setTemplateConfigModalOpen] = useState<boolean>(false);
  const [templateConfigImage, setTemplateConfigImage] = useState<string | null>(null);
  const [templateConfigName, setTemplateConfigName] = useState<string>('');
  const [templateConfigCategory, setTemplateConfigCategory] = useState<string>('ecommerce');
  const [templateConfigSubcategory, setTemplateConfigSubcategory] = useState<string>('shoes_bags');

  // Keep editor state in sync when switching template presets
  useEffect(() => {
    if (!activeTemplate) return;
    setCurrentImage(activeTemplate.originalImage);
    setImageHistory([activeTemplate.originalImage]);
    setHistoryIndex(0);
    setAnnotations(activeTemplate.defaultAnnotations);
    setActiveAnnotationId(null);
    setTempCoordinate(null);
    
    // Create initial version history snapshot for the new template
    setVersionHistory([
      {
        id: 'v-init-' + Date.now(),
        image: activeTemplate.originalImage,
        title: '项目初始化 - 原始摄影',
        title_en: 'Project Init - Original',
        timestamp: new Date().toTimeString().split(' ')[0],
        annotations: [...activeTemplate.defaultAnnotations]
      }
    ]);
  }, [activeTemplate]);

  // Helper trigger premium Toast
  const triggerToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ show: true, text, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4500);
  };

  // Toggle template favorited state
  const toggleFavoriteTemplate = (id: string, e: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavoriteTemplateIds(prev => {
      const isStarred = prev.includes(id);
      if (isStarred) {
        triggerToast(language === 'zh' ? '⭐ 已从常用收藏中移除' : '⭐ Removed from favorites', 'info');
        return prev.filter(item => item !== id);
      } else {
        triggerToast(language === 'zh' ? '❤️ 成功添加至常用高定样板收藏' : '❤️ Saved to favorite templates!', 'success');
        return [...prev, id];
      }
    });
  };

  // Drag and drop base image file pipeline
  const processUploadedFile = (file: File, workflow?: { template?: ImageState; styleOption?: WorkflowStyleOption | null; metadata?: typeof customCampaignMeta }) => {
    if (!file) return;
    const workflowTemplate = workflow?.template;
    const workflowStyle = workflow?.styleOption || null;
    const workflowMetadata = workflow?.metadata;
    const productName = workflowMetadata?.productName.trim() || '';
    const companyName = workflowMetadata?.companyName.trim() || '';
    const productPrice = workflowMetadata?.productPrice.trim() || '';
    const notes = workflowMetadata?.notes.trim() || '';
    const metadataSummary = [
      productName && `产品名称：${productName}`,
      companyName && `公司名称：${companyName}`,
      productPrice && `产品价格：${productPrice}`,
      notes && `备注：${notes}`
    ].filter(Boolean).join('｜');
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      if (!dataUrl) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Build Variant B: Warm Golden Hour shading
        const canvasB = document.createElement('canvas');
        canvasB.width = img.width;
        canvasB.height = img.height;
        const ctxB = canvasB.getContext('2d');
        if (ctxB) {
          ctxB.drawImage(img, 0, 0);
          const grad = ctxB.createRadialGradient(
            img.width * 0.8, img.height * 0.2, 0,
            img.width * 0.5, img.height * 0.5, Math.max(img.width, img.height) * 0.75
          );
          grad.addColorStop(0, 'rgba(14, 122, 134, 0.45)');
          grad.addColorStop(0.5, 'rgba(122, 100, 70, 0.2)');
          grad.addColorStop(1, 'rgba(18, 15, 12, 0.1)');
          ctxB.globalCompositeOperation = 'multiply';
          ctxB.fillStyle = grad;
          ctxB.fillRect(0, 0, img.width, img.height);
        }
        let variantBDataUrl = canvasB.toDataURL('image/jpeg', 0.9);

        // Build Variant C: Cool macro contrast
        const canvasC = document.createElement('canvas');
        canvasC.width = img.width;
        canvasC.height = img.height;
        const ctxC = canvasC.getContext('2d');
        if (ctxC) {
          ctxC.drawImage(img, 0, 0);
          const grad = ctxC.createRadialGradient(
            img.width * 0.2, img.height * 0.8, 0,
            img.width * 0.5, img.height * 0.5, Math.max(img.width, img.height) * 0.75
          );
          grad.addColorStop(0, 'rgba(110, 130, 150, 0.4)');
          grad.addColorStop(0.6, 'rgba(50, 60, 70, 0.25)');
          grad.addColorStop(1, 'rgba(18, 18, 18, 0.2)');
          ctxC.globalCompositeOperation = 'overlay';
          ctxC.fillStyle = grad;
          ctxC.fillRect(0, 0, img.width, img.height);
        }
        let variantCDataUrl = canvasC.toDataURL('image/jpeg', 0.9);

        if (workflowStyle) {
          const buildStyleVariant = (mode: 'primary' | 'alternate') => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) return dataUrl;

            ctx.drawImage(img, 0, 0);

            const sweep = ctx.createLinearGradient(0, 0, img.width, img.height);
            sweep.addColorStop(0, mode === 'primary' ? 'rgba(255,255,255,0.28)' : 'rgba(255,255,255,0.12)');
            sweep.addColorStop(0.48, workflowStyle.accent + (mode === 'primary' ? '42' : '30'));
            sweep.addColorStop(1, mode === 'primary' ? 'rgba(15,23,42,0.34)' : 'rgba(0,0,0,0.26)');
            ctx.globalCompositeOperation = workflowStyle.id === 'magazine_minimal' ? 'multiply' : 'soft-light';
            ctx.fillStyle = sweep;
            ctx.fillRect(0, 0, img.width, img.height);

            const focus = ctx.createRadialGradient(
              img.width * (mode === 'primary' ? 0.78 : 0.22),
              img.height * (mode === 'primary' ? 0.24 : 0.72),
              0,
              img.width * 0.5,
              img.height * 0.5,
              Math.max(img.width, img.height) * 0.82
            );
            focus.addColorStop(0, workflowStyle.accent + (mode === 'primary' ? '38' : '24'));
            focus.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.globalCompositeOperation = 'overlay';
            ctx.fillStyle = focus;
            ctx.fillRect(0, 0, img.width, img.height);

            return canvas.toDataURL('image/jpeg', 0.92);
          };

          variantBDataUrl = buildStyleVariant('primary');
          variantCDataUrl = buildStyleVariant('alternate');
        }

        const customTemplate: ImageState = {
          id: `upload-${Date.now()}`,
          name: workflowStyle ? `${productName || file.name.split('.')[0] || 'Imported Specimen'} · ${workflowStyle.name}` : (file.name.split('.')[0] || 'Imported Specimen'),
          chineseName: workflowStyle ? `${productName || workflowStyle.name_zh} · 商品宣传图（定制）` : (language === 'zh' ? '📥 本地载入高品质底片' : 'Imported Ateliers Base'),
          description: workflowStyle ? [workflowStyle.description, companyName && `Company: ${companyName}`, productPrice && `Price: ${productPrice}`].filter(Boolean).join(' · ') : `Custom artwork. Weight: ${(file.size / 1024).toFixed(1)} KB.`,
          description_zh: workflowStyle ? [workflowStyle.description_zh, metadataSummary].filter(Boolean).join('｜') : `本地导入的高精度摄影底本。规格: ${(file.size / 1024).toFixed(1)} KB。支持自主打点微雕。`,
          description_en: workflowStyle ? workflowStyle.description : undefined,
          category: workflowTemplate?.category || 'ecommerce',
          subcategory: workflowTemplate?.subcategory,
          author: 'You (Curator)',
          avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
          originalImage: dataUrl,
          styleVariants: {
            original: dataUrl,
            variantB: variantBDataUrl,
            variantC: variantCDataUrl
          },
          promptSuggestions: [
            workflowStyle?.prompt_zh || '重构背景为米色极简沙漠戈壁',
            productName ? `产品名称：${productName}` : '保留主体轮廓与商品识别度',
            companyName ? `公司名称：${companyName}` : (productPrice ? `产品价格：${productPrice}` : '保持版面信息简洁高级'),
            notes ? `备注：${notes}` : '投射具有雕塑感的阴影层次'
          ].slice(0, 4),
          promptSuggestions_zh: [
            workflowStyle?.prompt_zh || '重构背景为米色极简沙漠戈壁',
            productName ? `产品名称：${productName}` : '保留主体轮廓与商品识别度',
            companyName ? `公司名称：${companyName}` : (productPrice ? `产品价格：${productPrice}` : '保持版面信息简洁高级'),
            notes ? `备注：${notes}` : '投射具有雕塑感的阴影层次'
          ].slice(0, 4),
          promptSuggestions_en: [
            workflowStyle?.prompt || 'Transform backdrop into gallery travertine texture',
            productName ? `Product: ${productName}` : 'Preserve the subject outline and product recognizability',
            companyName ? `Company: ${companyName}` : (productPrice ? `Price: ${productPrice}` : 'Keep the campaign layout restrained and premium'),
            notes ? `Notes: ${notes}` : 'Introduce architectural high-contrast direct shadows'
          ].slice(0, 4),
          defaultAnnotations: []
        };

        setTemplates(prev => [customTemplate, ...prev]);
        setActiveTemplateIndex(0);
        if (workflowStyle) {
          setStylePreset(workflowStyle.name);
        }
        setVersionHistory([
          {
            id: 'v-init-' + Date.now(),
            image: dataUrl,
            title: workflowStyle
              ? `单图多风格工作流 - ${workflowStyle.name_zh}`
              : '上传置景底板 - ' + (file.name.split('.')[0] || '底图'),
            title_en: workflowStyle
              ? `Single Image Style Workflow - ${workflowStyle.name}`
              : 'Uploaded Platform Base - ' + (file.name.split('.')[0] || 'Image'),
            promptApplied: [workflowStyle?.prompt_zh, metadataSummary].filter(Boolean).join('｜') || undefined,
            timestamp: new Date().toTimeString().split(' ')[0],
            annotations: []
          }
        ]);
        setActiveTab('sandbox');
        triggerToast(
          language === 'zh' 
            ? (workflowStyle ? `图像导入成功，已套用「${workflowStyle.name_zh}」风格工作流。` : '✨ 图像导入成功。已为您自动合成高拟真光影变幻版！')
            : '✨ Specification imported. Fluid dynamic shadow presets generated!', 
          'success'
        );
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processUploadedFile(file);
  };

  const handleSaveUserTemplate = () => {
    const title = newTemplateName.trim() || (language === 'zh' ? '✨ 个人高定模板' : '✨ Saved Bespoke Template');
    const imageSrc = templateSourceType === 'current' ? currentImage : (uploadedTemplateFile || currentImage);

    const newTpl: ImageState = {
      id: `tpl-user-${Date.now()}`,
      name: title,
      chineseName: title,
      description: 'Your bespoke archived masterpiece with tailored light alignments and studio setups.',
      description_zh: '您个人专属归档的画意名家级置景底片，配以高阶高反差高级光影雕琢。',
      description_en: 'Your bespoke archived masterpiece with tailored light alignments and studio setups.',
      category: 'commercial',
      author: language === 'zh' ? '您个人创作' : 'Your Creation',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
      originalImage: imageSrc,
      styleVariants: {
        original: imageSrc,
        variantB: imageSrc,
        variantC: imageSrc
      },
      promptSuggestions: [
        '优化高定背景渲染',
        '精细打磨光影边缘结构'
      ],
      promptSuggestions_zh: [
        '优化高定背景渲染',
        '精细打磨光影边缘结构'
      ],
      promptSuggestions_en: [
        'Refine premium backdrop highlights',
        'Polishing meticulous light and shadow outline'
      ],
      defaultAnnotations: [...annotations], // capture current annotations too!
      isUserTemplate: true // Flag to identify user-created templates
    };

    setTemplates(prev => [newTpl, ...prev]);
    // Set the active template to this newly created one
    setActiveTemplateIndex(0);
    // Reset inputs
    setNewTemplateName('');
    setUploadedTemplateFile(null);
    setTemplateSourceType('current');
    
    // Switch scope filter to user so they see it instantly in left sidebar list
    setPresetScope('user');

    triggerToast(
      language === 'zh' 
        ? '🌟 画意模版已存入您个人的高定画意模板库！您可在左侧“我的画意”中调用！' 
        : '🌟 Bespoke Template archived successfully! Find it in left bar "My Presets".',
      'success'
    );
  };

  // --- Dynamic Template Fast-Track Actions ---
  const handleTriggerTemplateUpload = () => {
    // Call hidden input to load file directly
    document.getElementById('hidden-template-uploader-input')?.click();
  };

  const handleTemplateFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const rawFileName = file.name.split('.')[0] || '';
        const suggestedName = rawFileName || (language === 'zh' ? '我的私人高定' : 'My Custom Specimen');
        
        // Instead of immediate save, open the state-driven configuration popup
        setTemplateConfigImage(dataUrl);
        setTemplateConfigName(suggestedName);
        setTemplateConfigCategory('ecommerce');
        setTemplateConfigSubcategory('shoes_bags');
        setTemplateConfigModalOpen(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveConfiguredTemplate = () => {
    if (!templateConfigImage) return;
    
    const finalName = templateConfigName.trim() || (language === 'zh' ? '备置高定研发样板' : 'Atelier Bespoke Preset');
    const newTpl: ImageState = {
      id: `tpl-user-${Date.now()}`,
      name: finalName,
      chineseName: finalName,
      description: 'A custom styled template that is fully paired and instantly active.',
      description_zh: `由于导入了专属置景底片，自动在类目中映射并锁定安全备份。分类：${templateConfigCategory} / ${templateConfigSubcategory}`,
      description_en: `A custom styled template configured under ${templateConfigCategory} > ${templateConfigSubcategory}.`,
      category: templateConfigCategory,
      subcategory: templateConfigSubcategory,
      author: language === 'zh' ? '高定主理人' : 'Atelier Master',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
      isUserTemplate: true,
      originalImage: templateConfigImage,
      styleVariants: {
        original: templateConfigImage,
        variantB: templateConfigImage,
        variantC: templateConfigImage
      },
      promptSuggestions: [
        '优化当前全景质感',
        '营造晨曦古典氛围'
      ],
      promptSuggestions_zh: [
        '优化当前全景质感',
        '营造晨曦古典氛围'
      ],
      promptSuggestions_en: [
        'Polish ambient lighting outlines',
        'Accentuate shadow patterns'
      ],
      defaultAnnotations: []
    };

    setTemplates(prev => [newTpl, ...prev]);
    setActiveTemplateIndex(0);
    setLastUploadedUserTemplate(newTpl);
    setCurrentImage(templateConfigImage);
    setUploadedTemplateFile(templateConfigImage);
    setTemplateSourceType('file');
    setTemplateConfigModalOpen(false);

    triggerToast(
      language === 'zh'
        ? `🎉 专属样板 “${finalName}” 类目归档成功，并已同步闪电套用！`
        : `🎉 Template "${finalName}" successfully archived & workspace paired!`,
      'success'
    );
  };

  const handleExportConfig = () => {
    const configData = {
      exportedAt: new Date().toISOString(),
      activeAspectRatio: aspectRatio,
      activeStylePreset: stylePreset,
      currentCanvasImage: currentImage,
      annotationsCount: annotations.length,
      customTemplates: templates.filter(t => t.isUserTemplate)
    };
    
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(configData, null, 2)
    )}`;
    
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `atelier-workspace-preset-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    triggerToast(
      language === 'zh'
        ? '📤 成功导出高定样板与画布配置包 (JSON)！'
        : '📤 Atelier configuration & presets bundle exported as JSON!',
      'success'
    );
  };

  // --- Pixel Interactive Canvas click ---
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (activeTab !== 'sandbox' || sliderSplit || isGenerating) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 100);

    setTempCoordinate({ x, y });
    setActiveAnnotationId(null); // Fold other detail cards, highlight editor
    setRightSidebarOpen(true); // Auto reveal right adjustment bar to prevent canvas occlusion!
  };

  const confirmAnnotationNode = () => {
    if (!tempCoordinate || !newAnnotationText.trim()) return;

    const mappedCategory = language === 'zh' 
      ? (newAnnotationCategory === 'Material Synthesis' ? '材质替换' : newAnnotationCategory === 'Atelier Set' ? '置景渲染' : '局部消除')
      : newAnnotationCategory;

    const newAnn: Annotation = {
      id: `ann-custom-${Date.now()}`,
      x: tempCoordinate.x,
      y: tempCoordinate.y,
      label: newAnnotationText,
      label_zh: language === 'zh' ? newAnnotationText : undefined,
      label_en: language === 'en' ? newAnnotationText : undefined,
      author: language === 'zh' ? '您 (工作坊主创)' : 'You (Lead Curator)',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80',
      status: 'pending',
      timestamp: language === 'zh' ? '刚刚' : 'Just now',
      timestamp_zh: '刚刚',
      timestamp_en: 'Just now',
      category: newAnnotationCategory,
      category_zh: mappedCategory,
      category_en: newAnnotationCategory
    };

    setAnnotations(prev => [...prev, newAnn]);
    setNewAnnotationText('');
    setTempCoordinate(null);
    triggerToast(
      language === 'zh' ? '🏷️ 标注成功。点击下方“创图极境微雕”开始打磨精雕。' : '🏷️ Placement confirmed. Click "Refine Specification" to polish the rendering.', 
      'info'
    );
  };

  const discardAnnotation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setAnnotations(prev => prev.filter(a => a.id !== id));
    if (activeAnnotationId === id) setActiveAnnotationId(null);
    triggerToast(language === 'zh' ? '已抛弃该微雕批注点' : 'Selected note anchor dropped.', 'info');
  };

  // --- Premium Neural Scanning Simulation (Scanning light ray effect) ---
  const executeSimulationGen = (specificPrompt?: string) => {
    if (annotations.length === 0 && !specificPrompt) {
      triggerToast(
        language === 'zh' 
          ? '提示：请先在画面中任意点选打下定位针，或选择内置预设。' 
          : 'Atelier Notice: Click canvas path coordinates to designate a revision point first.', 
        'error'
      );
      return;
    }

    setIsGenerating(true);
    setGenerationStepProgress(10);
    setGenerationStepLabel(language === 'zh' ? '1/4 解析所锚位点及其像素邻近色彩空间...' : '1/4 Dissecting anchor coordinates and adjacent color spaces...');

    setTimeout(() => {
      setGenerationStepProgress(45);
      setGenerationStepLabel(language === 'zh' ? '2/4 重构立体深度，剥离物理表面光影配方...' : '2/4 Extracting volumetric deep structures and surface albedos...');
    }, 1200);

    setTimeout(() => {
      setGenerationStepProgress(75);
      setGenerationStepLabel(language === 'zh' ? '3/4 深度画幅局部二阶段重构，高分子纹质重塑...' : '3/4 Diffusing high-fidelity secondary textures into context...');
    }, 2400);

    setTimeout(() => {
      setGenerationStepProgress(95);
      setGenerationStepLabel(language === 'zh' ? '4/4 调和自然反射与冷光源阴影修边...' : '4/4 Finalizing high-frequency edge adjustments and shadow profiles...');
    }, 3600);

    setTimeout(() => {
      // Pick variant dynamically
      const nextVariant = historyIndex % 2 === 0 
        ? activeTemplate.styleVariants.variantB 
        : activeTemplate.styleVariants.variantC;

      setCurrentImage(nextVariant);

      const nextHistory = [...imageHistory.slice(0, historyIndex + 1), nextVariant];
      setImageHistory(nextHistory);
      setHistoryIndex(nextHistory.length - 1);

      // Confirm all annotations as processed
      const updatedAnns = annotations.map(ann => ({ ...ann, status: 'completed' as const }));
      setAnnotations(updatedAnns);

      // Add a structured Version snapshot to the Version History
      const lastAnnPrompt = specificPrompt || (annotations.length > 0 ? annotations[annotations.length - 1].label : 'AI 综合打磨重构');
      const newVersion: HistoryVersion = {
        id: `v-edit-${Date.now()}`,
        image: nextVariant,
        title: `高级 AI 微雕成果 #v${nextHistory.length - 1}`,
        title_en: `AI Render Master #v${nextHistory.length - 1}`,
        promptApplied: lastAnnPrompt,
        timestamp: new Date().toTimeString().split(' ')[0],
        annotations: updatedAnns
      };
      setVersionHistory(prev => [...prev, newVersion]);

      setIsGenerating(false);
      setGenerationStepProgress(100);
      triggerToast(
        language === 'zh' ? '🎨 画境漫反重构，微雕生成已臻完美并已留存历史版本。' : '🎨 Spatial texture refinement rendered successfully and saved to Version History.', 
        'success'
      );
    }, 4500);
  };

  // Split-screen Compare handler
  const handleSplitMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderSplit || !splitContainerRef.current) return;
    const rect = splitContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    setBeforeAfterSplitValue(x);
  };

  // History operators
  const applyUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentImage(imageHistory[historyIndex - 1]);
      triggerToast(language === 'zh' ? '已回溯至上一步骤' : 'Step reverted.', 'info');
    }
  };

  const applyRedo = () => {
    if (historyIndex < imageHistory.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentImage(imageHistory[historyIndex + 1]);
      triggerToast(language === 'zh' ? '已重构下一步骤' : 'Step advanced.', 'info');
    }
  };

  const rebaseOriginal = () => {
    setCurrentImage(activeTemplate.originalImage);
    setImageHistory([activeTemplate.originalImage]);
    setHistoryIndex(0);
    setAnnotations(activeTemplate.defaultAnnotations);
    triggerToast(language === 'zh' ? '画布已完全还原至初始摄影状态' : 'Reverted to baseline configuration.', 'info');
  };

  // Track which tab launched the remix view so the back button can return there.
  const [remixOrigin, setRemixOrigin] = useState<'quickstart' | 'templates'>('templates');

  const handleRemixTemplate = (templateId: string) => {
    const idx = templates.findIndex(t => t.id === templateId);
    if (idx !== -1) {
      setActiveTemplateIndex(idx);
      setRemixUploads([null, null, null]);
      setRemixFiles([null, null, null]);
      setRemixDragSlot(null);
      setSelectedRemixStyleId(WORKFLOW_STYLE_OPTIONS[0].id);
      setRemixGeneratedImage(null);
      setRemixIsGenerating(false);
      setRemixGenerationLabel('');
      setCustomCampaignMeta({ productName: '', companyName: '', productPrice: '', notes: '' });
      setTryonSource('system');
      setTryonSystemModelId(SYSTEM_MODELS[0].id);
      setVmGender('female');
      setVmAge('adult');
      setVmEthnicity('asian');
      setTryonAutoMatch(true);
      setTryonNote('');
      setTryonProductError(false);
      // Record the launching tab; quickstart returns to quickstart, anything else returns to the plaza.
      setRemixOrigin(activeTab === 'quickstart' ? 'quickstart' : 'templates');
      setActiveTab('remix');
    }
  };

  // Per-workflow upload mode. Listed ids use the two-image flow; every other workflow stays single-image.
  // Extend this set as new example workflows with their own upload modes arrive.
  const remixIsDual = (tpl?: ImageState | null) => Boolean(tpl && REMIX_DUAL_IDS.has(tpl.id));
  const remixHasStylePicker = (tpl?: ImageState | null) => Boolean(tpl && REMIX_STYLE_PICKER_IDS.has(tpl.id));
  const remixIsTryon = (tpl?: ImageState | null) => Boolean(tpl && REMIX_TRYON_IDS.has(tpl.id));
  const selectedRemixStyle = WORKFLOW_STYLE_OPTIONS.find((style) => style.id === selectedRemixStyleId) || WORKFLOW_STYLE_OPTIONS[0];

  // Reset only the Model Try-On parameters (keeps the product upload in place).
  const resetTryon = () => {
    setTryonSource('system');
    setTryonSystemModelId(SYSTEM_MODELS[0].id);
    setVmGender('female');
    setVmAge('adult');
    setVmEthnicity('asian');
    setTryonAutoMatch(true);
    setTryonNote('');
    setTryonProductError(false);
    setRemixUploads((prev) => { const next = [...prev]; next[1] = null; next[2] = null; return next; });
    setRemixFiles((prev) => { const next = [...prev]; next[1] = null; next[2] = null; return next; });
    triggerToast(language === 'zh' ? '已重置模特参数' : 'Model parameters reset', 'info');
  };

  const loadRenderImage = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

  const drawContainedImage = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const ratio = Math.min(width / img.width, height / img.height);
    const drawW = img.width * ratio;
    const drawH = img.height * ratio;
    const drawX = x + (width - drawW) / 2;
    const drawY = y + (height - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  };

  const synthesizeRemixResult = async () => {
    const source = remixUploads[0];
    if (!source) return null;

    const product = await loadRenderImage(source);
    const isCustomCampaign = remixHasStylePicker(activeTemplate);
    const isTryonWorkflow = remixIsTryon(activeTemplate);
    const style = isCustomCampaign ? selectedRemixStyle : null;
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) return source;

    const accent = style?.accent || (isTryonWorkflow ? '#0e7a86' : '#111111');
    const baseGradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    baseGradient.addColorStop(0, isCustomCampaign ? '#f7f7f4' : '#f2f3f1');
    baseGradient.addColorStop(0.52, '#ffffff');
    baseGradient.addColorStop(1, isTryonWorkflow ? '#e8f1f1' : '#e8e7e2');
    ctx.fillStyle = baseGradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(1110, 220, 230, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(180, 930, 340, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.18)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 22;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillRect(150, 110, 690, 860);
    ctx.restore();
    drawContainedImage(ctx, product, 205, 165, 580, 735);

    const shade = ctx.createLinearGradient(0, 0, canvas.width, 0);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(0.64, `${accent}24`);
    shade.addColorStop(1, 'rgba(0,0,0,0.12)');
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#080808';
    ctx.font = '700 42px Outfit, Arial, sans-serif';
    ctx.fillText(
      isTryonWorkflow
        ? (language === 'zh' ? 'AI 模特试穿图' : 'AI MODEL TRY-ON')
        : isCustomCampaign
          ? (customCampaignMeta.productName.trim() || (language === 'zh' ? '商品宣传图' : 'Product Campaign'))
          : (language === 'zh' ? '商品宣传图（快速）' : 'Product Campaign'),
      920,
      285
    );
    ctx.fillStyle = '#545454';
    ctx.font = '500 24px Outfit, Arial, sans-serif';
    ctx.fillText(
      isTryonWorkflow
        ? (language === 'zh' ? '自动匹配模特、光影与商品比例' : 'Model, light and product scale matched')
        : (style ? (language === 'zh' ? style.name_zh : style.name) : (language === 'zh' ? '快速电商视觉生成' : 'Fast ecommerce render')),
      920,
      334
    );

    const infoRows = isCustomCampaign
      ? [
          customCampaignMeta.companyName.trim(),
          customCampaignMeta.productPrice.trim(),
          customCampaignMeta.notes.trim()
        ].filter(Boolean)
      : isTryonWorkflow
        ? [
            tryonSource === 'system'
              ? (SYSTEM_MODELS.find((m) => m.id === tryonSystemModelId)?.name_zh || '系统模特')
              : tryonSource === 'virtual'
                ? `${VM_ETHNICITIES.find((x) => x.id === vmEthnicity)?.zh || ''}${VM_AGES.find((a) => a.id === vmAge)?.zh || ''}${VM_GENDERS.find((g) => g.id === vmGender)?.zh || ''}`
                : (language === 'zh' ? '自定义上传模特' : 'Uploaded model'),
            tryonNote.trim()
          ].filter(Boolean)
        : [];

    ctx.fillStyle = accent;
    ctx.fillRect(920, 390, 92, 5);
    ctx.fillStyle = '#101010';
    ctx.font = '600 22px Outfit, Arial, sans-serif';
    infoRows.slice(0, 3).forEach((row, idx) => {
      ctx.fillText(row.slice(0, 32), 920, 455 + idx * 42);
    });

    ctx.fillStyle = '#111111';
    ctx.font = '700 18px JetBrains Mono, monospace';
    ctx.fillText('FOTO / GENERATED WORKFLOW', 920, 915);
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(920, 935, 330, 1);

    return canvas.toDataURL('image/jpeg', 0.92);
  };

  const generateRemixResult = async () => {
    if (!remixFiles[0] || !remixUploads[0]) {
      setTryonProductError(remixIsTryon(activeTemplate));
      triggerToast(language === 'zh' ? '请先上传商品图片' : 'Please upload a product image first', 'error');
      return;
    }
    if (remixIsTryon(activeTemplate) && tryonSource === 'upload' && !remixFiles[2]) {
      triggerToast(language === 'zh' ? '请上传你的模特图片' : 'Please upload your model image', 'error');
      return;
    }

    setRemixIsGenerating(true);
    setRemixGenerationLabel(language === 'zh' ? '正在解析商品主体...' : 'Parsing product subject...');
    window.setTimeout(() => setRemixGenerationLabel(language === 'zh' ? '正在匹配工作流风格...' : 'Matching workflow style...'), 650);
    window.setTimeout(() => setRemixGenerationLabel(language === 'zh' ? '正在合成最终图像...' : 'Compositing final image...'), 1300);

    try {
      await new Promise((resolve) => window.setTimeout(resolve, 1850));
      const result = await synthesizeRemixResult();
      if (result) {
        setRemixGeneratedImage(result);
        triggerToast(language === 'zh' ? '图片已生成，可下载或重新生成。' : 'Image generated. You can download or regenerate.', 'success');
      }
    } catch (error) {
      triggerToast(language === 'zh' ? '生成失败，请重新尝试。' : 'Generation failed. Please try again.', 'error');
    } finally {
      setRemixIsGenerating(false);
      setRemixGenerationLabel('');
    }
  };

  const downloadRemixResult = () => {
    if (!remixGeneratedImage) return;
    const anchor = document.createElement('a');
    anchor.href = remixGeneratedImage;
    anchor.download = `foto-generated-${activeTemplate.id}-${Date.now()}.jpg`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const renderGeneratedActions = (tone: 'dark' | 'light' = 'dark') => {
    if (remixIsGenerating) {
      return (
        <div className={`rx-enter w-full flex items-center justify-center gap-2.5 py-4 text-sm font-bold tracking-tight ${tone === 'dark' ? 'bg-[#080808] text-white' : 'bg-white text-[#080808] border border-white/70'}`}>
          <RefreshCw className="w-4 h-4 animate-spin" />
          {remixGenerationLabel || (language === 'zh' ? '正在生成图片...' : 'Generating image...')}
        </div>
      );
    }

    if (!remixGeneratedImage) return null;

    const base = tone === 'dark'
      ? 'border-[#080808] bg-[#080808] text-white hover:bg-white hover:text-[#080808]'
      : 'border-white/70 bg-white text-[#080808] hover:bg-transparent hover:text-white';
    const ghost = tone === 'dark'
      ? 'border-stone-300 bg-white text-[#080808] hover:border-[#080808]'
      : 'border-white/45 bg-transparent text-white hover:bg-white hover:text-[#080808]';

    return (
      <div className="rx-enter grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={downloadRemixResult}
          className={`flex items-center justify-center gap-2 py-4 border text-[12px] font-mono tracking-[0.16em] uppercase transition-all cursor-pointer ${base}`}
        >
          <Download className="w-4 h-4" />
          {language === 'zh' ? '下载图片' : 'Download'}
        </button>
        <button
          onClick={generateRemixResult}
          className={`flex items-center justify-center gap-2 py-4 border text-[12px] font-mono tracking-[0.16em] uppercase transition-all cursor-pointer ${ghost}`}
        >
          <RefreshCw className="w-4 h-4" />
          {language === 'zh' ? '重新生成' : 'Regenerate'}
        </button>
      </div>
    );
  };

  const renderResultPreview = (className = '') => {
    if (!remixGeneratedImage) return null;
    return (
      <div className={`rx-preview relative overflow-hidden bg-[#0c0c0e] ${className}`}>
        <img src={remixGeneratedImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/75 to-transparent">
          <span className="inline-flex items-center gap-2 text-white text-[11px] font-mono tracking-[0.16em] uppercase">
            <CheckCircle2 className="w-4 h-4" />
            {language === 'zh' ? '生成结果' : 'Generated Result'}
          </span>
        </div>
      </div>
    );
  };

  // Validate before generating: the product image is mandatory.
  const handleTryonGenerate = () => {
    if (!remixFiles[0]) {
      setTryonProductError(true);
      triggerToast(language === 'zh' ? '请先上传商品图片' : 'Please upload a product image first', 'error');
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const zone = remixRef.current?.querySelector('.tryon-product-zone');
        if (zone) gsap.fromTo(zone, { x: -7 }, { x: 0, duration: 0.55, ease: 'elastic.out(1, 0.35)' });
      }
      return;
    }
    if (tryonSource === 'upload' && !remixFiles[2]) {
      triggerToast(language === 'zh' ? '请上传你的模特图片' : 'Please upload your model image', 'error');
      return;
    }
    generateRemixResult();
  };

  const animateStyleTileHover = (tile: HTMLButtonElement, entering: boolean) => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const image = tile.querySelector('.rx-style-img');
    const shine = tile.querySelector('.rx-style-shine');
    const label = tile.querySelector('.rx-style-label');

    gsap.to(tile, {
      y: entering ? -8 : 0,
      scale: entering ? 1.045 : 1,
      rotation: entering ? -1.25 : 0,
      duration: entering ? 0.48 : 0.42,
      ease: 'power3.out',
      overwrite: 'auto'
    });
    gsap.to(image, {
      scale: entering ? 1.12 : 1,
      duration: 0.75,
      ease: 'power3.out',
      overwrite: 'auto'
    });
    gsap.to(label, {
      y: entering ? -3 : 0,
      autoAlpha: entering ? 1 : 0.92,
      duration: 0.35,
      ease: 'power2.out',
      overwrite: 'auto'
    });
    if (entering) {
      gsap.fromTo(shine,
        { xPercent: -150, autoAlpha: 0.65 },
        { xPercent: 150, autoAlpha: 0, duration: 0.7, ease: 'power3.out', overwrite: 'auto' }
      );
    }
  };

  // Remix page: accept an image into a slot (click / drop) — preview only, defer the heavy pipeline.
  const acceptRemixFile = (slot: number, file?: File | null) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (slot === 0) setTryonProductError(false);
    setRemixGeneratedImage(null);
    setRemixFiles((prev) => { const next = [...prev]; next[slot] = file; return next; });
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = (e.target?.result as string) || null;
      setRemixUploads((prev) => { const next = [...prev]; next[slot] = url; return next; });
    };
    reader.readAsDataURL(file);
  };

  const openRemixPicker = (slot: number) => {
    remixPickSlotRef.current = slot;
    // On phones, let the user choose camera vs. album; on desktop go straight to the file dialog.
    if (isMobile) {
      setPickerSheetOpen(true);
    } else {
      remixInputRef.current?.click();
    }
  };

  const pickFromCamera = () => { setPickerSheetOpen(false); remixCameraInputRef.current?.click(); };
  const pickFromGallery = () => { setPickerSheetOpen(false); remixInputRef.current?.click(); };

  const handleRemixDrop = (slot: number, e: React.DragEvent) => {
    e.preventDefault();
    setRemixDragSlot(null);
    acceptRemixFile(slot, e.dataTransfer.files?.[0]);
  };

  // Generate in-place on the workflow page, applying the active workflow.
  const generateFromRemix = () => {
    generateRemixResult();
  };

  const remixCheckerStyle = { backgroundImage: 'repeating-conic-gradient(#f1f1f3 0% 25%, #ffffff 0% 50%)', backgroundSize: '22px 22px' } as const;

  // A single upload slot — empty dropzone or uploaded preview.
  // opts.minHClass overrides the height; opts.hint overrides the helper line (null hides it).
  const renderRemixSlot = (slot: number, compact: boolean, opts?: { minHClass?: string; hint?: string | null; error?: boolean }) => {
    const url = remixUploads[slot];
    const active = remixDragSlot === slot;
    const error = Boolean(opts?.error) && !url;
    const minH = opts?.minHClass ?? (compact ? 'min-h-[290px]' : 'min-h-[380px]');
    const showHint = error ? true : (opts?.hint !== undefined ? opts.hint !== null : !compact);
    const hintText = error
      ? (language === 'zh' ? '商品图片为必填项，请上传' : 'Product image is required')
      : ((opts?.hint !== undefined && opts?.hint !== null)
        ? opts.hint
        : (language === 'zh' ? '支持 PNG / JPG，推荐使用透明背景商品图' : 'PNG / JPG — transparent product cut-outs recommended'));
    if (url) {
      return (
        <div className={`rx-preview relative ${compact ? '' : 'flex-1'} ${minH} rounded-2xl overflow-hidden border border-stone-200 group`}>
          <div className="absolute inset-0 opacity-70" style={remixCheckerStyle} />
          <img src={url} alt="" className={`relative z-10 w-full h-full object-contain ${compact ? 'p-4' : 'p-6'}`} />
          <div className="absolute inset-0 z-20 bg-[#121212]/0 group-hover:bg-[#121212]/40 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={() => openRemixPicker(slot)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white text-[#121212] text-xs font-bold hover:bg-white/90 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {language === 'zh' ? '重新上传' : 'Replace'}
            </button>
          </div>
        </div>
      );
    }
    return (
      <div
        onClick={() => openRemixPicker(slot)}
        onDragOver={(e) => { e.preventDefault(); setRemixDragSlot(slot); }}
        onDragLeave={() => setRemixDragSlot((s) => (s === slot ? null : s))}
        onDrop={(e) => handleRemixDrop(slot, e)}
        className={`rx-enter group relative ${compact ? '' : 'flex-1'} ${minH} rounded-2xl overflow-hidden border-2 border-dashed cursor-pointer transition-all duration-300 ${
          active ? 'border-[#0e7a86] scale-[1.01] shadow-[0_18px_48px_rgba(14,122,134,0.12)]' : error ? 'border-red-300 bg-red-50/30' : 'border-stone-200 hover:border-[#0e7a86]/45'
        }`}
      >
        <div className={`absolute inset-0 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-60'}`} style={remixCheckerStyle} />
        <div className={`absolute inset-0 bg-[#0e7a86]/[0.04] transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-4 px-4 text-center pointer-events-none">
          <div className={`rx-upload-icon ${compact ? 'w-14 h-14' : 'w-20 h-20'} rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1.5 ${
            active ? 'bg-[#0e7a86] text-white scale-110 -translate-y-1.5' : error ? 'bg-red-100 text-red-500' : 'bg-[#0e7a86]/10 text-[#0e7a86] group-hover:bg-[#0e7a86]/15'
          }`}>
            <ArrowUp className={compact ? 'w-6 h-6' : 'w-8 h-8'} strokeWidth={2.2} />
          </div>
          <div className="space-y-1.5">
            <p className={`${compact ? 'text-[12.5px]' : 'text-[15px]'} font-bold text-[#121212] tracking-tight`}>
              {active
                ? (language === 'zh' ? '松手即可载入' : 'Release to load')
                : (language === 'zh' ? '点击或拖拽图片' : 'Click or drag an image')}
            </p>
            {showHint && (
              <p className={`${compact ? 'text-[10.5px]' : 'text-[11.5px]'} ${error ? 'text-red-500 font-medium' : 'text-stone-400 font-light'}`}>
                {hintText}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSwissCampaignUploadSlot = () => {
    const url = remixUploads[0];
    const active = remixDragSlot === 0;
    if (url) {
      return (
        <div className="rx-preview relative min-h-[132px] border border-stone-200 bg-white overflow-hidden group">
          <img src={url} alt="" className="absolute inset-0 w-full h-full object-contain p-4" />
          <div className="absolute inset-0 bg-white/0 group-hover:bg-white/82 transition-colors duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={() => openRemixPicker(0)}
              className="inline-flex items-center gap-2 px-3 py-2 border border-[#121212] bg-white text-[#121212] text-[10px] font-mono tracking-[0.16em] uppercase hover:bg-[#121212] hover:text-white transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              {language === 'zh' ? '重新上传' : 'Replace'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => openRemixPicker(0)}
        onDragOver={(e) => { e.preventDefault(); setRemixDragSlot(0); }}
        onDragLeave={() => setRemixDragSlot((s) => (s === 0 ? null : s))}
        onDrop={(e) => handleRemixDrop(0, e)}
        className={`rx-enter group min-h-[132px] border cursor-pointer flex flex-col items-center justify-center gap-3 transition-all duration-300 ${
          active ? 'border-[#121212] bg-stone-50' : 'border-stone-200 bg-white hover:border-stone-400'
        }`}
      >
        <ArrowUp className={`w-5 h-5 transition-transform duration-300 ${active ? '-translate-y-1 text-[#121212]' : 'text-stone-500 group-hover:-translate-y-0.5'}`} strokeWidth={1.55} />
        <span className="text-[12px] font-mono tracking-[0.18em] uppercase text-stone-700">
          {active
            ? (language === 'zh' ? '松手载入图片' : 'Release to load')
            : (language === 'zh' ? '点击或拖拽图片' : 'Click or drag image')}
        </span>
      </div>
    );
  };

  // Model Try-On upload zone — minimal framed dropzone with a cursor-tracking spotlight (light, precise, small radius).
  const renderTryonSlot = (slot: number, opts: { minHClass: string; hint?: string | null; error?: boolean }) => {
    const url = remixUploads[slot];
    const active = remixDragSlot === slot;
    const error = Boolean(opts.error) && !url;
    const showHint = error ? true : opts.hint != null;
    const hintText = error
      ? (language === 'zh' ? '商品图片为必填项，请上传' : 'Product image is required')
      : (opts.hint || '');
    const bracket = error ? 'border-red-300' : active ? 'border-[#0e7a86]' : 'border-stone-300 group-hover:border-[#0e7a86]/60';

    if (url) {
      return (
        <div className={`relative ${opts.minHClass} overflow-hidden border border-stone-200 bg-stone-50/70 group`}>
          <img src={url} alt="" className="relative z-10 w-full h-full object-contain p-4" />
          <div className="absolute inset-0 z-20 bg-white/0 group-hover:bg-white/60 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button
              onClick={() => openRemixPicker(slot)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0a0a0a] text-white text-[11px] font-bold uppercase tracking-wider hover:bg-black transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              {language === 'zh' ? '重新上传' : 'Replace'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        onClick={() => openRemixPicker(slot)}
        onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`); e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`); }}
        onDragOver={(e) => { e.preventDefault(); setRemixDragSlot(slot); }}
        onDragLeave={() => setRemixDragSlot((s) => (s === slot ? null : s))}
        onDrop={(e) => handleRemixDrop(slot, e)}
        style={{ '--mx': '50%', '--my': '50%' } as React.CSSProperties}
        className={`group relative ${opts.minHClass} rounded-lg overflow-hidden cursor-pointer border transition-colors duration-300 ${error ? 'border-red-200 bg-red-50/20' : active ? 'border-[#0e7a86]/50 bg-[#0e7a86]/[0.02]' : 'border-stone-200 bg-[#fcfcfd] hover:border-stone-300'}`}
      >
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(200px circle at var(--mx) var(--my), ${error ? 'rgba(239,68,68,0.10)' : 'rgba(14,122,134,0.11)'}, transparent 60%)` }}
        />
        <span className={`pointer-events-none absolute top-3 left-3 w-4 h-4 border-t border-l ${bracket} transition-colors duration-300`} />
        <span className={`pointer-events-none absolute top-3 right-3 w-4 h-4 border-t border-r ${bracket} transition-colors duration-300`} />
        <span className={`pointer-events-none absolute bottom-3 left-3 w-4 h-4 border-b border-l ${bracket} transition-colors duration-300`} />
        <span className={`pointer-events-none absolute bottom-3 right-3 w-4 h-4 border-b border-r ${bracket} transition-colors duration-300`} />
        <div className="relative z-10 h-full flex flex-col items-center justify-center gap-3 px-4 text-center pointer-events-none">
          <div className={`w-11 h-11 rounded-md flex items-center justify-center transition-all duration-300 group-hover:-translate-y-1 ${error ? 'bg-red-100 text-red-500' : active ? 'bg-[#0e7a86] text-white' : 'bg-white text-[#0e7a86] border border-stone-100 shadow-sm group-hover:border-[#0e7a86]/30'}`}>
            <ArrowUp className="w-5 h-5" strokeWidth={2.2} />
          </div>
          <div className="space-y-1">
            <p className="text-[12.5px] font-bold text-[#121212] tracking-tight">
              {active ? (language === 'zh' ? '松手即可载入' : 'Release to load') : (language === 'zh' ? '点击或拖拽图片' : 'Click or drag an image')}
            </p>
            {showHint && (
              <p className={`text-[10.5px] ${error ? 'text-red-500 font-medium' : 'text-stone-400 font-light'}`}>{hintText}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  const catLabel = (id?: string) => {
    const c = CATEGORY_MAP.find((x) => x.id === id);
    return c ? (language === 'zh' ? c.name_zh : c.name_en) : (id || '');
  };

  

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#121212] flex flex-row font-sans transition-colors relative overflow-hidden antialiased select-none selection:bg-[#0e7a86]/20 selection:text-[#0b616b]">
      
      {/* Subtle organic light cream noise overlay */}
      <div className="absolute inset-0 bg-[#fafafa]/90 pointer-events-none -z-10 bg-[radial-gradient(#e5e1d8_1px,transparent_1px)] [background-size:18px_18px]" />

      {/* --- ELITE CHOREOGRAPHED MULTI-FUNCTIONAL TOAST --- */}
      <AnimatePresence>
        {toast.show && (
          <motion.div 
            initial={{ opacity: 0, y: -24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.98 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
            id="toast-alert"
          >
            <div className={`px-5 py-3 rounded-full border shadow-[0_12px_40px_rgba(0,0,0,0.04)] flex items-center gap-3.5 backdrop-blur-xl ${
              toast.type === 'success' 
                ? 'bg-white/95 border-[#0e7a86]/30 text-[#121212]' 
                : toast.type === 'error' 
                  ? 'bg-white/95 border-red-200 text-red-800' 
                  : 'bg-[#121212]/95 text-white/90 border-[#121212]'
            }`}>
              <Compass className={`w-3.5 h-3.5 ${toast.type === 'success' ? 'text-[#0e7a86]' : 'text-stone-400'}`} />
              <span className="text-xs font-medium tracking-wide font-sans">{toast.text}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MOBILE UPLOAD SOURCE CHOOSER (camera / album) --- */}
      {pickerSheetOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPickerSheetOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 p-3" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
            <div className="bg-white rounded-lg overflow-hidden shadow-2xl">
              <button onClick={pickFromCamera} className="w-full flex items-center gap-3 px-5 py-4 text-[15px] font-bold text-[#121212] active:bg-stone-100 transition-colors border-b border-stone-100">
                <Camera className="w-5 h-5 text-[#0e7a86]" />
                {language === 'zh' ? '拍照' : 'Take Photo'}
              </button>
              <button onClick={pickFromGallery} className="w-full flex items-center gap-3 px-5 py-4 text-[15px] font-bold text-[#121212] active:bg-stone-100 transition-colors">
                <ImageIcon className="w-5 h-5 text-[#0e7a86]" />
                {language === 'zh' ? '从相册选择' : 'Choose from Album'}
              </button>
            </div>
            <button onClick={() => setPickerSheetOpen(false)} className="mt-2 w-full bg-white rounded-lg py-4 text-[15px] font-bold text-stone-500 shadow-2xl active:bg-stone-100 transition-colors">
              {language === 'zh' ? '取消' : 'Cancel'}
            </button>
          </div>
        </div>
      )}

      {/* --- LEFT NAVIGATION VERTICAL DOCK (FLOATING BUBBLE CAPSULE) --- */}
      <aside
        ref={sidebarRef}
        onMouseEnter={() => setIsSidebarHovered(true)}
        onMouseLeave={() => setIsSidebarHovered(false)}
        style={{ width: 92, fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif' }}
        className="hidden lg:flex h-screen flex-col justify-stretch shrink-0 z-40 select-none overflow-hidden"
      >
        <div className="w-full h-full bg-white border-r-2 border-[#0a0a0a] flex flex-col items-center justify-between py-6 overflow-hidden relative">
          
          {/* Brand Logo */}
          <div 
            onClick={() => setActiveTab('quickstart')} 
            className="flex items-center gap-3 cursor-pointer select-none group w-full px-[14px] justify-start"
            title={isSidebarHovered ? undefined : (language === 'zh' ? '主页' : 'Home')}
          >
            <div className="w-10 h-10 shrink-0 bg-[#0e7a86] flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <span className="text-white font-black text-xl">F</span>
            </div>
            <span className="sb-label text-[#0a0a0a] font-black text-xl tracking-[0.18em] whitespace-nowrap">
              OTO
            </span>
          </div>

          {/* Navigation Items */}
          <div className="flex flex-col gap-5 flex-1 justify-center w-full px-[10px]">
            {[
              { id: 'quickstart', label_zh: '快速开始', label_en: 'Quick Start', icon: Sparkles },
              { id: 'templates', label_zh: '素材广场', label_en: 'Assets Plaza', icon: ImageIcon },
              { id: 'sandbox', label_zh: '工作台', label_en: 'Studio', icon: Sliders },
              { id: 'profile', label_zh: '个人中心', label_en: 'Profile', icon: User }
            ].map((item) => {
              const isActive = activeTab === item.id || (activeTab === 'remix' && item.id === remixOrigin);
              const IconComponent = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    triggerToast(
                      language === 'zh'
                        ? `已切换至：${item.label_zh}`
                        : `Tab switched to ${item.label_en}`,
                      'info'
                    );
                  }}
                  data-collapsed-w="48"
                  data-expanded-w="192"
                  data-collapsed-pad="14"
                  data-pad-x="16"
                  className={`sb-expandable relative h-12 rounded-none flex items-center justify-start transition-colors group outline-none cursor-pointer overflow-hidden gap-3 shrink-0 ${
                    isActive
                      ? 'bg-[#0e7a86]/[0.07] text-[#0a0a0a] font-extrabold'
                      : 'text-stone-400 hover:text-[#0a0a0a] hover:bg-stone-50'
                  }`}
                  title={isSidebarHovered ? undefined : (language === 'zh' ? item.label_zh : item.label_en)}
                >
                  {/* Swiss active indicator — solid block bar flush to the left edge */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 top-0 w-1 h-full bg-[#0e7a86]"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}

                  <IconComponent className={`sb-icon w-5 h-5 shrink-0 ${isActive ? 'text-[#0e7a86]' : ''}`} strokeWidth={isActive ? 2.4 : 2} />

                  <span className="sb-label text-[11px] font-bold uppercase tracking-[0.1em] whitespace-nowrap overflow-hidden text-left">
                    {language === 'zh' ? item.label_zh : item.label_en}
                  </span>

                  {/* Floating tooltip */}
                  {!isSidebarHovered && (
                    <div className="absolute left-[70px] bg-[#0a0a0a] text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-none shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                      {language === 'zh' ? item.label_zh : item.label_en}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer actions */}
          <div className="flex flex-col gap-3 items-center w-full px-[14px] pt-5 border-t border-stone-200/70">

            {/* Language Switcher */}
            <button
              onClick={() => {
                const target = language === 'zh' ? 'en' : 'zh';
                setLanguage(target);
                triggerToast(target === 'en' ? 'Workspace updated to English.' : '语言已被切换为中文。');
              }}
              data-collapsed-w="40"
              data-expanded-w="184"
              data-collapsed-pad="12"
              data-pad-x="16"
              className="sb-expandable h-10 rounded-none border border-stone-300 bg-white flex items-center justify-start text-[#0a0a0a] hover:border-[#0e7a86] hover:text-[#0e7a86] transition-colors outline-none cursor-pointer overflow-hidden gap-3 shrink-0"
              title={isSidebarHovered ? undefined : (language === 'zh' ? '切换语言 EN/ZH' : 'Switch Language ZH/EN')}
            >
              <Languages className="sb-icon w-4 h-4 text-[#0e7a86] shrink-0" />
              <span className="sb-label text-[11px] font-bold uppercase tracking-wider whitespace-nowrap overflow-hidden">
                {language === 'zh' ? 'EN / 中文' : 'ZH / English'}
              </span>
            </button>

            {/* Account Profile / Premium Login Badge */}
            {userLoggedIn ? (
              <div
                onClick={() => {
                  setActiveTab('profile');
                  triggerToast(language === 'zh' ? '已进入您的主页中心' : 'Entered user curation profile.', 'info');
                }}
                data-collapsed-w="40"
                data-expanded-w="184"
                data-collapsed-pad="6"
                data-pad-x="6"
                className="sb-expandable h-10 rounded-none border border-stone-200 flex items-center justify-start cursor-pointer overflow-hidden gap-2.5 hover:border-[#0e7a86] transition-colors shrink-0"
                title={language === 'zh' ? '个人中心' : 'Profile'}
              >
                <img
                  src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=100&h=100&q=80"
                  alt="Avatar"
                  className="sb-icon w-7 h-7 rounded-none object-cover shrink-0"
                />
                <span className="sb-label text-[11px] font-extrabold uppercase tracking-wider text-[#0a0a0a] truncate select-none whitespace-nowrap">
                  {username}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                data-collapsed-w="40"
                data-expanded-w="184"
                data-collapsed-pad="12"
                data-pad-x="12"
                className="sb-expandable h-10 rounded-none bg-[#0e7a86] hover:bg-[#0b616b] flex items-center justify-start text-white cursor-pointer overflow-hidden gap-3 shrink-0"
                title={isSidebarHovered ? undefined : (language === 'zh' ? '设计师登录' : 'Sign In')}
              >
                <User className="sb-icon w-4 h-4 text-white shrink-0" />
                <span className="sb-label text-[11px] font-extrabold uppercase tracking-wider whitespace-nowrap overflow-hidden">
                  {language === 'zh' ? '设计师登录' : 'Sign In'}
                </span>
              </button>
            )}

          </div>
        </div>
      </aside>

      {/* --- RIGHT MAIN VIEWPORTS WRAPPER --- */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        
        {/* --- DYNAMIC HEADER CONTROL BAR --- */}
        <header className="h-[60px] bg-white border-b border-stone-200/60 px-4 lg:px-8 flex items-center justify-between shrink-0 z-30" id="studio-header">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-bold tracking-widest text-stone-900 uppercase font-mono">
              {activeTab === 'quickstart' ? (language === 'zh' ? '快速开始' : 'Quick Start') :
               activeTab === 'templates' ? (language === 'zh' ? '素材广场' : 'Assets Plaza') :
               activeTab === 'sandbox' ? (language === 'zh' ? '高定创意工作台' : 'Studio Workbench') :
               activeTab === 'remix' ? (language === 'zh' ? '工作流编辑' : 'Workflow Remix') :
               (language === 'zh' ? '个人创作中心' : 'Personal Center')}
            </h2>
            <div className="w-1.5 h-1.5 rounded-full bg-[#0e7a86] animate-pulse" />
          </div>
        </header>

        {/* --- MAIN STRUCTURE --- */}
        <main ref={mainViewRef} className="flex-1 overflow-hidden flex flex-row relative">
        
        {/* VIEW 1: ADVANCED SANDBOX */}
        {activeTab === 'sandbox' && (
          <div className="w-full h-full flex flex-row divide-x divide-stone-200/50 relative overflow-hidden">
            
            {/* L1. RETRACTABLE LEFT SIDEBAR: CORE INJECTORS & PRESETS GALLERY */}
            <AnimatePresence initial={false}>
              {leftSidebarOpen && (
                <motion.aside 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 300, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 220 }}
                  className="bg-white scrollbar-none overflow-y-auto shrink-0 flex flex-col justify-between border-r border-stone-200/50 z-20 h-full"
                  id="left-tool-sidebar"
                >
                  <div className="flex flex-col h-full justify-between">
                    {/* Sliding Dynamic Workspace Tabs */}
                    <div className="flex border-b border-stone-200 bg-stone-50/50 p-1 m-3 rounded-lg border">
                      <button
                        onClick={() => setLeftSidebarTab('presets')}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md tracking-wide transition-all ${
                          leftSidebarTab === 'presets'
                            ? 'bg-white text-[#121212] shadow-[0_2px_6px_rgba(0,0,0,0.04)] font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        {language === 'zh' ? '素材与样板' : 'Presets'}
                      </button>
                      <button
                        onClick={() => {
                          setLeftSidebarTab('brand');
                          triggerToast(language === 'zh' ? '💼 品牌视觉资产库已载入' : '💼 Brand visual assets loaded.');
                        }}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-md tracking-wide transition-all ${
                          leftSidebarTab === 'brand'
                            ? 'bg-white text-[#121212] shadow-[0_2px_6px_rgba(0,0,0,0.04)] font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                        }`}
                      >
                        {language === 'zh' ? '品牌资产库' : 'Brand Space'}
                      </button>
                    </div>

                    {/* Left Sidebar Content Panel */}
                    <div className="flex-1 p-5 overflow-y-auto scrollbar-none space-y-6 pt-2">
                      {leftSidebarTab === 'presets' ? (
                        <div className="space-y-6">
                          {/* File Uploader Unit */}
                          <div>
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block mb-1.5">
                              {language === 'zh' ? '素材库' : 'Library'}
                            </span>
                            <h3 className="text-xs font-semibold tracking-wide text-[#121212] flex items-center gap-1.5 mb-3">
                              <FolderOpen className="w-3.5 h-3.5 text-[#0e7a86]" />
                              <span>{language === 'zh' ? '上传专属产品底图' : 'Import Custom Specimen'}</span>
                            </h3>

                            <div className="space-y-2">
                              <motion.label 
                                onMouseEnter={() => setIsUploadHovered(true)}
                                onMouseLeave={() => setIsUploadHovered(false)}
                                className="relative overflow-hidden group flex flex-col items-center justify-center p-5 border border-stone-200 hover:border-transparent rounded-xl cursor-pointer text-center bg-stone-50/50 hover:shadow-md transition-all duration-500"
                              >
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                
                                <motion.div 
                                  initial={{ y: "-100%" }}
                                  animate={{ y: isUploadHovered ? "0%" : "-100%" }}
                                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                  className="absolute inset-0 bg-gradient-to-b from-[#0e7a86]/90 to-[#0b4a52] pointer-events-none z-0"
                                />

                                <div className="relative z-10 flex flex-col items-center justify-center">
                                  <motion.div 
                                    animate={{ 
                                      scale: isUploadHovered ? 1.05 : 1,
                                      backgroundColor: isUploadHovered ? "rgba(255, 255, 255, 0.15)" : "rgba(255, 255, 255, 0.95)"
                                    }}
                                    className="w-8 h-8 rounded-full flex items-center justify-center border shadow-sm mb-2"
                                  >
                                    <Upload className={`w-3.5 h-3.5 ${isUploadHovered ? 'text-white' : 'text-stone-500'}`} />
                                  </motion.div>
                                  
                                  <motion.span 
                                    animate={{ color: isUploadHovered ? "#ffffff" : "#121212" }}
                                    className="text-[11px] font-semibold block tracking-wide"
                                  >
                                    {language === 'zh' ? '载入高精度底片' : 'Load High-Res Specimen'}
                                  </motion.span>
                                </div>
                              </motion.label>
                            </div>
                          </div>



                          {/* Quick instruction directives */}
                          <div className="space-y-4 pt-4 border-t border-stone-100">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '高定场景快捷指令' : 'Premium Stage Actions'}
                            </span>
                            
                            <div className="space-y-2.5">
                              {/* Option 1: Eliminate Background */}
                              <button
                                onClick={() => {
                                  setActiveQuickAction('none');
                                  const textZh = '消除背景并自动替换为极简干净、极富高定光影质感的奢华艺术电商影棚置景';
                                  const textEn = 'Eliminate background and replace with an ultra-minimalistic, high-end professional luxury studio backdrop with soft ambient light.';
                                  setNewAnnotationText(language === 'zh' ? textZh : textEn);
                                  setNewAnnotationCategory('Atelier Set');
                                  triggerToast(
                                    language === 'zh' 
                                      ? '⚡ 消除背景指令已就绪！请点击主图任意位置摆放锚点定位以生效。' 
                                      : '⚡ Background elimination ready! Click on the right canvas to place coordinate anchors.',
                                    'success'
                                  );
                                }}
                                className="w-full text-left p-3 rounded-xl border border-stone-200 bg-gradient-to-br from-white to-[#fafafa] hover:border-[#0e7a86] transition-all hover:shadow-[0_4px_12px_rgba(14,122,134,0.12)] flex items-center justify-between group"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="w-7 h-7 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600 transition-colors group-hover:bg-[#0e7a86]/10 group-hover:text-[#0b616b]">
                                    <Layers className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="text-xs font-bold text-stone-800">{language === 'zh' ? '1. 智能消除背景' : '1. Smart Eliminate Background'}</p>
                                    <p className="text-[9.5px] text-stone-400 font-medium">{language === 'zh' ? '一键置换纯净高定影棚' : 'Replace with elegant atelier set'}</p>
                                  </div>
                                </div>
                                <ChevronRight className="w-3.5 h-3.5 text-stone-300 group-hover:text-[#0b616b] transition-all group-hover:translate-x-0.5" />
                              </button>

                              {/* Option 2: Add Model (Expandable) */}
                              <div className="border border-stone-200 rounded-xl bg-gradient-to-br from-white to-[#fafafa] overflow-hidden transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] pb-1">
                                <button
                                  onClick={() => {
                                    const nextState = activeQuickAction === 'model' ? 'none' : 'model';
                                    setActiveQuickAction(nextState);
                                    
                                    // Prepopulate model prompt on click
                                    const ageLabel = modelAge === 'infant' ? (language === 'zh' ? '婴幼儿(0-3岁)' : 'infant/baby') :
                                                     modelAge === 'youth' ? (language === 'zh' ? '青少年(12-18岁)' : 'teenage/youth') :
                                                     modelAge === 'adult' ? (language === 'zh' ? '超模中青年(20-35岁)' : 'fashion supermodel') :
                                                     (language === 'zh' ? '成熟中老年(50岁+)' : 'senior/mature');
                                    const genderLabel = modelGender === 'female' ? (language === 'zh' ? '优雅女性' : 'female') : (language === 'zh' ? '绅士男性' : 'male');
                                    
                                    const textZh = `在商品主体旁自然地融入一位高冷气质的${genderLabel}、${ageLabel}模特，模特姿态与商品光影完美交融，整体呈现奢华高定杂志风。`;
                                    const textEn = `Seamlessly blend a professional ${genderLabel} ${ageLabel} model with the product in active posture, natural interactions, studio key lighting.`;
                                    
                                    setNewAnnotationText(language === 'zh' ? textZh : textEn);
                                    setNewAnnotationCategory('Atelier Set');
                                  }}
                                  className={`w-full text-left p-3 flex items-center justify-between group transition-colors ${activeQuickAction === 'model' ? 'bg-[#0e7a86]/5' : ''}`}
                                >
                                  <div className="flex items-center gap-2.5">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors ${activeQuickAction === 'model' ? 'bg-[#0e7a86]/20 text-[#0b616b]' : 'bg-stone-100 text-stone-600 group-hover:bg-[#0e7a86]/10 group-hover:text-[#0b616b]'}`}>
                                      <Sparkles className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-stone-800">{language === 'zh' ? '2. 时尚高定添加模特' : '2. Add Fashion Model'}</p>
                                      <p className="text-[9.5px] text-stone-400 font-medium">{language === 'zh' ? '多年龄段高级定制模特配置' : 'Bespoke age stages & gender configs'}</p>
                                    </div>
                                  </div>
                                  <ChevronRight className={`w-3.5 h-3.5 text-stone-400 transition-transform ${activeQuickAction === 'model' ? 'rotate-90 text-[#0b616b]' : 'group-hover:translate-x-0.5'}`} />
                                </button>

                                <AnimatePresence initial={false}>
                                  {activeQuickAction === 'model' && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      className="overflow-hidden border-t border-stone-100 bg-white/70 px-3 py-3 space-y-3 font-sans"
                                    >
                                      {/* Age Segment Selection */}
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-stone-400 tracking-wider uppercase font-mono block">
                                          {language === 'zh' ? '选择模特年龄阶段' : 'Select Model Age Stage'}
                                        </span>
                                        <div className="grid grid-cols-2 gap-1 bg-stone-50 p-1 rounded-xl">
                                          {[
                                            { key: 'infant', zh: '🍼 婴幼儿阶段', en: '🍼 Infant' },
                                            { key: 'youth', zh: '🎒 青少年阶段', en: '🎒 Teenager' },
                                            { key: 'adult', zh: '✨ 超模中青年', en: '✨ Adult/Mature' },
                                            { key: 'elderly', zh: '⏳ 岁月上色中老年', en: '⏳ Senior' }
                                          ].map((opt) => (
                                            <button
                                              key={opt.key}
                                              onClick={() => {
                                                const targetAge = opt.key as any;
                                                setModelAge(targetAge);
                                                
                                                const ageLabel = targetAge === 'infant' ? (language === 'zh' ? '婴幼儿(0-3岁)' : 'infant/baby') :
                                                                 targetAge === 'youth' ? (language === 'zh' ? '青少年(12-18岁)' : 'teenage/youth') :
                                                                 targetAge === 'adult' ? (language === 'zh' ? '超模中青年(20-35岁)' : 'fashion supermodel') :
                                                                 (language === 'zh' ? '岁月上色中老年(50岁+)' : 'senior/mature');
                                                const genderLabel = modelGender === 'female' ? (language === 'zh' ? '优雅女性' : 'female') : (language === 'zh' ? '绅士男性' : 'male');
                                                
                                                const textZh = `在商品主体旁自然地融入一位高冷气质的${genderLabel}、${ageLabel}模特，模特姿态与商品光影完美交融，整体呈现奢华高定杂志风。`;
                                                const textEn = `Seamlessly blend a professional ${genderLabel} ${ageLabel} model with the product in active posture, natural interactions, studio key lighting.`;
                                                
                                                setNewAnnotationText(language === 'zh' ? textZh : textEn);
                                                setNewAnnotationCategory('Atelier Set');
                                                triggerToast(
                                                  language === 'zh' ? `已更新年龄为：${opt.zh}` : `Model age updated: ${opt.en}`,
                                                  'info'
                                                );
                                              }}
                                              className={`py-1.5 px-2 rounded-lg text-[9.5px] text-left font-medium transition-all ${
                                                modelAge === opt.key 
                                                  ? 'bg-[#121212] text-[#fafafa] font-bold shadow-sm' 
                                                  : 'text-stone-500 hover:text-stone-900'
                                              }`}
                                            >
                                              {language === 'zh' ? opt.zh : opt.en}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* Gender Segment Selection */}
                                      <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-stone-400 tracking-wider uppercase font-mono block">
                                          {language === 'zh' ? '选择模特性别' : 'Select Gender'}
                                        </span>
                                        <div className="grid grid-cols-2 gap-1 bg-stone-50 p-1 rounded-xl">
                                          {[
                                            { key: 'female', zh: '👗 优雅时尚女性', en: '👗 Female' },
                                            { key: 'male', zh: '👔 绅士考究男性', en: '👔 Male' }
                                          ].map((opt) => (
                                            <button
                                              key={opt.key}
                                              onClick={() => {
                                                const targetGender = opt.key as any;
                                                setModelGender(targetGender);
                                                
                                                const ageLabel = modelAge === 'infant' ? (language === 'zh' ? '婴幼儿(0-3岁)' : 'infant/baby') :
                                                                 modelAge === 'youth' ? (language === 'zh' ? '青少年(12-18岁)' : 'teenage/youth') :
                                                                 modelAge === 'adult' ? (language === 'zh' ? '超模中青年(20-35岁)' : 'fashion supermodel') :
                                                                 (language === 'zh' ? '岁月上色中老年(50岁+)' : 'senior/mature');
                                                const genderLabel = targetGender === 'female' ? (language === 'zh' ? '优雅女性' : 'female') : (language === 'zh' ? '绅士男性' : 'male');
                                                
                                                const textZh = `在商品主体旁自然地融入一位高冷气质的${genderLabel}、${ageLabel}模特，模特姿态与商品光影完美交融，整体呈现奢华高定杂志风。`;
                                                const textEn = `Seamlessly blend a professional ${genderLabel} ${ageLabel} model with the product in active posture, natural interactions, studio key lighting.`;
                                                
                                                setNewAnnotationText(language === 'zh' ? textZh : textEn);
                                                setNewAnnotationCategory('Atelier Set');
                                                triggerToast(
                                                  language === 'zh' ? `已更新性别为：${opt.zh}` : `Model gender updated: ${opt.en}`,
                                                  'info'
                                                );
                                              }}
                                              className={`py-1.5 px-2 rounded-lg text-[9.5px] text-center font-bold transition-all ${
                                                modelGender === opt.key 
                                                  ? 'bg-[#121212] text-[#fafafa] shadow-sm' 
                                                  : 'text-stone-500 hover:text-stone-900'
                                              }`}
                                            >
                                              {language === 'zh' ? opt.zh : opt.en}
                                            </button>
                                          ))}
                                        </div>
                                      </div>

                                      {/* High-frequency Feedbacks output config */}
                                      <div className="p-2.5 border border-[#0e7a86]/20 rounded-xl bg-gradient-to-br from-[#fafafa]/55 to-[#0e7a86]/15 text-[9.5px] leading-relaxed text-[#121212] font-mono select-text font-medium relative">
                                        <div className="text-[8px] tracking-widest uppercase font-bold text-[#0b616b] mb-1 flex items-center gap-1">
                                          <Sparkles className="w-2.5 h-2.5 text-[#0b616b] animate-pulse" />
                                          {language === 'zh' ? '高定智能生成指令' : 'Injected Custom Prompt'}
                                        </div>
                                        <p className="text-stone-600 italic font-serif leading-normal">
                                          "{newAnnotationText}"
                                        </p>
                                        <p className="text-[8px] text-[#0e7a86] font-bold mt-1 uppercase flex items-center gap-1">
                                          <Check className="w-2.5 h-2.5" />
                                          {language === 'zh' ? '实时指令已装填！请点击中图精准落子落位打磨。' : 'Model setup fully armed! Now click right image to set.'}
                                        </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* TAB 2 BRAND ASSETS SPACE (品牌资产库) */
                        <div className="space-y-5 animate-fade-in text-xs font-sans">
                          {/* Brand watermark switcher */}
                          <div className="space-y-2">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '1. 品牌水印及 Logo' : '1. Brand Watermark & Logo'}
                            </span>
                            
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { id: null, label: '无 / None' },
                                { id: 'AETHER', label: '⚜️ Aether' },
                                { id: 'SOLACE', label: '✒️ Solace' },
                                { id: 'VORTEX', label: '⚡ Vortex' }
                              ].map((item, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedBrandLogo(item.id);
                                    triggerToast(
                                      language === 'zh' 
                                        ? `已将画布品牌水印设定为: ${item.label}` 
                                        : `Brand watermark set to ${item.label}`
                                    );
                                  }}
                                  className={`p-2 rounded-lg border text-left transition-all ${
                                    selectedBrandLogo === item.id 
                                      ? 'border-[#0e7a86] bg-[#0e7a86]/5 font-bold' 
                                      : 'border-stone-100 hover:bg-stone-50 text-stone-600'
                                  }`}
                                >
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Watermark position selector */}
                          {selectedBrandLogo && (
                            <div className="space-y-2 pt-2 border-t border-stone-100">
                              <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                                {language === 'zh' ? '水印摆放位置' : 'Position'}
                              </span>
                              
                              <div className="grid grid-cols-4 gap-1.5">
                                {[
                                  { key: 'top-left', label: '↖️' },
                                  { key: 'top-right', label: '↗️' },
                                  { key: 'bottom-left', label: '↙️' },
                                  { key: 'bottom-right', label: '↘️' }
                                ].map((item, i) => (
                                  <button
                                    key={i}
                                    onClick={() => setLogoPosition(item.key as any)}
                                    className={`py-1.5 rounded border text-center text-xs transition-all ${
                                      logoPosition === item.key 
                                        ? 'border-[#0e7a86] bg-[#0e7a86]/5 font-bold' 
                                        : 'border-stone-100 hover:bg-stone-50 text-stone-500'
                                    }`}
                                  >
                                    {item.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Watermark Custom Copy Input */}
                          <div className="space-y-2 pt-2 border-t border-stone-100">
                            <span className="text-[9px] font-bold text-stone-400 tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '自定义文字防伪水印' : 'Custom Safeguard Wording'}
                            </span>
                            <input
                              type="text"
                              value={brandWatermarkText}
                              onChange={(e) => setBrandWatermarkText(e.target.value)}
                              placeholder={language === 'zh' ? '例：CONFIDENTIAL RENDER' : 'e.g. STUDIO SPECIMEN ONLY'}
                              className="w-full bg-[#fafafa] border border-stone-200 rounded-lg py-1.5 px-3 text-xs focus:outline-none focus:border-[#0e7a86]"
                            />
                          </div>

                          {/* Brand Premium Color Palette Swatches */}
                          <div className="space-y-2 pt-3 border-t border-stone-100">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '2. 品牌标准色域标准 (点选复制配置词)' : '2. Brand Color Standards'}
                            </span>
                            
                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { name: '高奢描金', name_en: 'Luxury Gold', hex: '#0e7a86' },
                                { name: '深幽墨玉', name_en: 'Abyssal Jade', hex: '#2e5a44' },
                                { name: '暗夜玄岩', name_en: 'Obsidian Velvet', hex: '#121212' },
                                { name: '高定绯红', name_en: 'Sartorial Crimson', hex: '#a33b3b' }
                              ].map((col, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedBrandColor(col.hex);
                                    // Inject color hint as text suggest if they click!
                                    setNewAnnotationText(prev => prev + `，搭配${col.name}`);
                                    navigator.clipboard.writeText(col.hex);
                                    triggerToast(
                                      language === 'zh' 
                                        ? `🎨 色温已套用。已自动在修改提示末尾中注入：${col.name}` 
                                        : `🎨 Color swatch applied: ${col.name_en}`
                                    );
                                  }}
                                  className={`p-2 rounded-xl border text-left flex items-center gap-2.5 transition-all outline-none ${
                                    selectedBrandColor === col.hex 
                                      ? 'border-[#0e7a86] bg-stone-50' 
                                      : 'border-stone-100 hover:border-stone-300'
                                  }`}
                                >
                                  <span className="w-4 h-4 rounded-full shadow-inner flex-shrink-0" style={{ backgroundColor: col.hex }} />
                                  <div className="truncate">
                                    <p className="text-[10px] font-semibold text-[#121212] truncate">{language === 'zh' ? col.name : col.name_en}</p>
                                    <p className="text-[8px] font-mono text-stone-400 mt-0.5">{col.hex}</p>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Brand typography libraries */}
                          <div className="space-y-2 pt-3 border-t border-stone-100">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '3. 品牌御用字体' : '3. Brand Typography Font'}
                            </span>
                            
                            <div className="grid grid-cols-2 gap-1.5">
                              {[
                                { font: 'Inter', desc: 'Clean Minimalist' },
                                { font: 'Playfair Display', desc: 'Elegant Serif' },
                                { font: 'Space Grotesk', desc: 'Kinetic Tech' },
                                { font: 'JetBrains Mono', desc: 'Modern Studio' }
                              ].map((f, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setSelectedBrandFont(f.font);
                                    triggerToast(
                                      language === 'zh' 
                                        ? `🔤 字体已绑定：${f.font}` 
                                        : `🔤 Font linked: ${f.font}`
                                    );
                                  }}
                                  className={`p-2 rounded-lg border text-left transition-all ${
                                    selectedBrandFont === f.font 
                                      ? 'border-[#0e7a86] bg-[#0e7a86]/5 font-bold' 
                                      : 'border-stone-100 hover:bg-stone-50 text-stone-600'
                                  }`}
                                >
                                  <p className="text-[10px] font-bold" style={{ fontFamily: f.font }}>{f.font}</p>
                                  <span className="text-[7.5px] text-stone-400 tracking-wide block">{f.desc}</span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Commonly used advertising copy overlayers */}
                          <div className="space-y-2 pt-3 border-t border-stone-100">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '4. 御用文案 (点击快速套入指令)' : '4. Master Copys (Appends to prompts)'}
                            </span>
                            
                            <div className="space-y-1">
                              {[
                                'THE ABSOLUTE MINIMAL ARTISTRY',
                                'PURE NATURE CRAFTED IN SILK',
                                'LIMITED REVOLUTIONARY FORMULA',
                                'CHOREOGRAPHED MORNING DIRECT GLOW'
                              ].map((txt, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    setNewAnnotationText(prev => prev ? `${prev}，加上品牌概念文案 "${txt}"` : `加上品牌文案水印 "${txt}"`);
                                    triggerToast(language === 'zh' ? '已在微雕指令文本框中嵌入该标准宣传文案。' : 'Concept copy appended.');
                                  }}
                                  className="w-full text-left p-2 rounded-lg border border-stone-100 hover:border-[#0e7a86]/40 hover:bg-stone-50 text-[10px] text-stone-500 font-mono transition-colors"
                                >
                                  "{txt}"
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Left Sidebar Footer */}
                    <div className="p-4 bg-stone-50 border-t border-stone-200/50 text-[10px] text-stone-400 font-mono tracking-wide flex items-center justify-between">
                      <span className="flex items-center gap-1">
                        <Shield className="w-3 h-3 text-[#0e7a86]" />
                        <span>Secured Workspace</span>
                      </span>
                      <span>Ready</span>
                    </div>
                  </div>
                </motion.aside>
              )}
            </AnimatePresence>

            {/* Toggle Button for Left Sidebar */}
            <button 
              onClick={() => setLeftSidebarOpen(prev => !prev)}
              className="absolute left-4 top-4 z-30 w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-500 hover:text-[#121212] transition-colors shadow-sm cursor-pointer"
              title="Toggle Left Sidebar"
            >
              <Menu className="w-3.5 h-3.5" />
            </button>

            {/* L2. THE SUBLIME WORKSPACE CANVAS STAGE */}
            <section className="flex-1 bg-[#f4f2eb] overflow-hidden flex flex-col justify-between relative">
              
              {/* TOP PRECISE CONTROL RIBBON */}
              <div className="h-12 border-b border-stone-200/60 bg-white/70 backdrop-blur-md px-6 flex items-center justify-between z-10 select-none">
                <div className="flex items-center gap-3">
                  {/* Status Indicator */}
                  <span className="flex items-center gap-2 text-[10px] font-mono font-medium tracking-wider text-[#0b616b] bg-stone-50 px-3 py-1 rounded-full border border-stone-200/60 font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0e7a86] animate-pulse" />
                    <span>{language === 'zh' ? '画面比例' : 'Aspect'} ({aspectRatio})</span>
                  </span>

                  {/* Contrast Mode & Show/Hide options */}
                  <div className="flex items-center gap-1.5 border-l border-stone-200/80 pl-2">
                    <button 
                      onClick={() => setShowAnnotations(prev => !prev)}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${showAnnotations ? 'bg-stone-100 text-[#0e7a86]' : 'text-stone-400 hover:text-stone-700'}`}
                      title="Hide/Show Focus Pins"
                    >
                      {showAnnotations ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                    <button 
                      onClick={() => {
                        setSliderSplit(!sliderSplit);
                        triggerToast(
                          !sliderSplit 
                            ? (language === 'zh' ? '⚙️ 对比模式已开启：左右拖动滑块查看对比' : '⚙️ Compare mode active: Drag slider to see before/after') 
                            : (language === 'zh' ? '已退回普通视图' : 'Compare mode closed.'), 
                          'info'
                        );
                      }}
                      className={`p-1.5 rounded-md transition-all cursor-pointer ${sliderSplit ? 'bg-stone-100 text-stone-700' : 'text-stone-400 hover:text-stone-700'}`}
                      title="Toggle Split-Compare view"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Undo/Redo/Rebase Utility HUD */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <button 
                      onClick={applyUndo}
                      disabled={historyIndex === 0}
                      className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-20 transition-all cursor-pointer text-stone-600"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={applyRedo}
                      disabled={historyIndex >= imageHistory.length - 1}
                      className="p-1.5 rounded hover:bg-stone-100 disabled:opacity-20 transition-all cursor-pointer text-stone-600"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={rebaseOriginal}
                      className="p-1.5 rounded text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                      title="Revert to original state"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Zoom Controls */}
                  <div className="flex items-center gap-2 bg-stone-100 px-2.5 py-1 rounded-full text-xs font-mono border border-stone-200/50">
                    <button onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))} className="font-bold text-stone-400 hover:text-[#121212]">-</button>
                    <span className="text-[10px] text-stone-600 font-bold w-9 text-center select-none">{zoomLevel}%</span>
                    <button onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))} className="font-bold text-stone-400 hover:text-[#121212]">+</button>
                  </div>
                </div>
              </div>

              {/* CENTRAL MATTE GLASS DISPLAY CONTAINER */}
              <div 
                className="flex-1 w-full overflow-auto flex items-center justify-center p-12 relative" 
                id="canvas-workspace-area"
                onClick={() => {
                  setTempCoordinate(null);
                  setActiveAnnotationId(null);
                }}
              >
                
                {/* ADVANCED LIGHT BEAM NEURAL SCANNER OVERLAY */}
                <AnimatePresence>
                  {isGenerating && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-[#f4f2eb]/90 z-30 flex flex-col items-center justify-center p-8 backdrop-blur"
                    >
                      <div className="max-w-sm w-full text-center space-y-5">
                        
                        {/* Sculpting Dial */}
                        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
                          <div className="absolute inset-0 rounded-full border border-[#0e7a86]/30 animate-spin-slow" />
                          <div className="absolute w-12 h-12 rounded-full border-t border-stone-700 animate-spin" />
                          <Compass className="w-4 h-4 text-[#0e7a86] animate-spin-slow" />
                        </div>

                        <div className="space-y-1.5">
                          <p className="text-xs font-semibold tracking-wider text-[#121212] font-sans uppercase">
                            {language === 'zh' ? '画境微雕重构中' : 'Atelier Diffusion Processing'}
                          </p>
                          <p className="text-[10px] text-[#0b616b] font-mono leading-relaxed">{generationStepLabel}</p>
                        </div>

                        {/* Solid Gold progress slider indicator */}
                        <div className="w-full bg-stone-200/80 h-0.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: "5%" }}
                            animate={{ width: `${generationStepProgress}%` }}
                            transition={{ duration: 0.4 }}
                            className="h-full bg-[#0e7a86]" 
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* THE PIXEL MATRIX CANVAS BOARD */}
                <div 
                  ref={splitContainerRef}
                  onMouseMove={handleSplitMouseMove}
                  className="relative cursor-crosshair shadow-[0_24px_55px_rgba(0,0,0,0.06)] border border-stone-300 bg-white transition-all duration-300 origin-center select-none"
                  style={{
                    width: (function() {
                      if (aspectRatio === '1:1') return '410px';
                      if (aspectRatio === '16:9') return '540px';
                      if (aspectRatio === '9:16') return '280px';
                      if (aspectRatio === '3:4') return '360px';
                      if (aspectRatio === '4:3') return '480px';
                      if (aspectRatio === '2:3') return '320px';
                      if (aspectRatio === '3:2') return '480px';
                      if (aspectRatio === '21:9') return '540px';
                      if (aspectRatio === 'original') {
                        const maxBound = 480;
                        if (imageAspectRatio >= 1) {
                          return `${maxBound}px`;
                        } else {
                          return `${Math.round(maxBound * imageAspectRatio)}px`;
                        }
                      }
                      return '410px';
                    })(),
                    height: (function() {
                      if (aspectRatio === '1:1') return '410px';
                      if (aspectRatio === '16:9') return '304px';
                      if (aspectRatio === '9:16') return '498px';
                      if (aspectRatio === '3:4') return '480px';
                      if (aspectRatio === '4:3') return '360px';
                      if (aspectRatio === '2:3') return '480px';
                      if (aspectRatio === '3:2') return '320px';
                      if (aspectRatio === '21:9') return '230px';
                      if (aspectRatio === 'original') {
                        const maxBound = 480;
                        if (imageAspectRatio >= 1) {
                          return `${Math.round(maxBound / imageAspectRatio)}px`;
                        } else {
                          return `${maxBound}px`;
                        }
                      }
                      return '410px';
                    })(),
                    transform: `scale(${zoomLevel / 100})`,
                  }}
                  onClick={handleCanvasClick}
                >
                  
                  {/* GENERATIVE MOVING SCAN BEAM */}
                  {isGenerating && (
                    <div className="absolute inset-x-0 h-8 bg-gradient-to-b from-[#0e7a86]/25 to-transparent border-t border-[#0e7a86]/70 z-20 pointer-events-none scan-ray" />
                  )}

                  {/* DOUBLE CLIP DISPLAY OR SOLID IMAGE */}
                  {sliderSplit ? (
                    <div className="absolute inset-0 w-full h-full pointer-events-none select-none">
                      <div className="absolute inset-0 w-full h-full bg-cover bg-center" style={{ backgroundImage: `url(${activeTemplate.originalImage})` }} />
                      <div 
                        className="absolute inset-0 w-full h-full bg-cover bg-center clip-slider"
                        style={{ 
                          backgroundImage: `url(${currentImage})`,
                          clipPath: `polygon(${beforeAfterSplitValue}% 0%, 100% 0%, 100% 100%, ${beforeAfterSplitValue}% 100%)` 
                        }} 
                      />
                      
                      {/* Brass-Gold micro-handle line */}
                      <div className="absolute top-0 bottom-0 w-[1px] bg-[#0e7a86] z-10 pointer-events-auto cursor-ew-resize" style={{ left: `${beforeAfterSplitValue}%` }}>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white border border-[#0e7a86] shadow flex items-center justify-center text-[#0e7a86] text-[10px] font-bold">
                          ↔
                        </div>
                      </div>

                       <span className="absolute bottom-3 left-3 z-10 px-2 py-0.5 text-[8px] tracking-widest bg-white/90 shadow text-[#1a1a1a] font-mono uppercase">Original</span>
                      <span className="absolute bottom-3 right-3 z-10 px-2 py-0.5 text-[8px] tracking-widest bg-white/90 shadow text-[#1a1a1a] font-mono uppercase">Synthesis</span>
                    </div>
                  ) : (
                    <img 
                      src={currentImage} 
                      alt="Atelier Specification Canvas" 
                      className="w-full h-full object-cover transition-opacity duration-300" 
                      draggable={false}
                    />
                  )}

                  {/* BRAND VISUAL WATERMARK OVERLAY */}
                  {selectedBrandLogo && (
                    <div 
                      style={{ fontFamily: selectedBrandFont }}
                      className={`absolute pointer-events-none z-10 px-3 py-2 select-none duration-300 rounded backdrop-blur-sm bg-black/25 text-[#fafafa] flex flex-col items-center ${
                        logoPosition === 'top-left' ? 'top-3 left-3' :
                        logoPosition === 'top-right' ? 'top-3 right-3' :
                        logoPosition === 'bottom-left' ? 'bottom-3 left-3' :
                        'bottom-3 right-3'
                      }`}
                    >
                      <span className="text-[10px] font-bold tracking-widest flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selectedBrandColor }} />
                        {selectedBrandLogo}
                      </span>
                      <span className="text-[6.5px] tracking-widest uppercase opacity-75 mt-0.5">Brand Certified</span>
                    </div>
                  )}

                  {/* CUSTOM WATERMARK SAFEGUARD TEXT */}
                  {brandWatermarkText && (
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center pointer-events-none z-10 select-none rotate-[-12deg]">
                      <span className="text-[11px] font-mono font-bold tracking-[0.25em] text-[#121212]/15 bg-white/30 backdrop-blur-[1px] px-3 py-1 rounded-md border border-black/5 uppercase">
                        {brandWatermarkText}
                      </span>
                    </div>
                  )}

                  {/* ACTIVE ANNOTATIONS LAYOUT LAYER (Aesthetic pin nodes) */}
                  {showAnnotations && !sliderSplit && (
                    <div className="absolute inset-0 w-full h-full z-10 pointer-events-none">
                      <AnimatePresence>
                        {annotations.map((ann, idx) => {
                          const isAnnActive = activeAnnotationId === ann.id;
                          return (
                            <div 
                              key={ann.id}
                              style={{ left: `${ann.x}%`, top: `${ann.y}%` }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-auto"
                            >
                              {/* Pulsing Aesthetic Gold Anchor Dot */}
                              <div 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveAnnotationId(isAnnActive ? null : ann.id);
                                  setTempCoordinate(null);
                                }}
                                className="relative flex items-center justify-center w-7 h-7 cursor-pointer group"
                              >
                                <div className={`absolute w-full h-full rounded-full transition-all duration-300 ${
                                  ann.status === 'pending' 
                                    ? 'bg-[#0e7a86]/30 animate-ping group-hover:bg-[#0e7a86]/50' 
                                    : 'bg-stone-700/20 group-hover:bg-stone-500/30'
                                }`} />
                                
                                <div className={`w-3.5 h-3.5 rounded-full border border-white shadow-[0_2px_8px_rgba(0,0,0,0.15)] flex items-center justify-center text-[8px] font-bold text-white transition-transform group-hover:scale-110 ${
                                  ann.status === 'pending' 
                                    ? 'bg-[#0e7a86]' 
                                    : 'bg-stone-700'
                                }`}>
                                  {idx + 1}
                                </div>
                              </div>

                              {/* Tiny Serif Card floating over anchors */}
                              {isAnnActive && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute top-8 left-1/2 -translate-x-1/2 w-[250px] bg-white border border-stone-200 rounded-xl shadow-[0_12px_32px_rgba(0,0,0,0.06)] p-3.5 z-20 text-xs pointer-events-auto"
                                >
                                  <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-2 gap-2">
                                    <span className="text-[8.5px] font-bold font-mono text-[#0b616b] px-1.5 py-0.5 rounded bg-stone-100 uppercase tracking-widest truncate">
                                      {language === 'zh' ? (ann.category_zh || ann.category) : (ann.category_en || ann.category)}
                                    </span>
                                    <button 
                                      onClick={(e) => discardAnnotation(ann.id, e)}
                                      className="p-1 hover:bg-stone-50 rounded text-stone-400 hover:text-red-600 transition-colors"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>

                                  <p className="text-stone-700 italic font-serif leading-relaxed text-[11px] bg-stone-50 p-2 rounded mb-2.5">
                                    {language === 'zh' ? (ann.label_zh || ann.label) : (ann.label_en || ann.label)}
                                  </p>

                                  <div className="flex items-center justify-between text-[10px]">
                                    <span className="text-stone-400">{ann.author}</span>
                                    {ann.status === 'pending' ? (
                                      <button 
                                        onClick={() => executeSimulationGen(ann.label)}
                                        className="py-1 px-2.5 bg-[#0e7a86] hover:bg-[#0b616b] text-white rounded text-[10px] font-medium tracking-wide flex items-center gap-1 shadow-sm"
                                      >
                                        <SlidersHorizontal className="w-2.5 h-2.5" />
                                        <span>{language === 'zh' ? '开始修改' : 'Refine'}</span>
                                      </button>
                                    ) : (
                                      <span className="text-stone-500 font-serif italic inline-flex items-center gap-1 text-[10px]">
                                        <Check className="w-3 h-3 text-[#0e7a86]" />
                                        <span>{language === 'zh' ? '已修改' : 'Done'}</span>
                                      </span>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  )}

                  {/* Empty coordinate indicator */}
                  {annotations.length === 0 && !tempCoordinate && (
                    <div className="absolute inset-x-4 top-4 z-10 pointer-events-none select-none text-center">
                      <span className="px-3.5 py-1.5 rounded-full text-[9px] bg-white/95 border border-stone-200 shadow-[0_2px_12px_rgba(0,0,0,0.02)] text-stone-500 font-mono tracking-wider uppercase">
                        {language === 'zh' ? '💬 点击画面各处，添加修改标记' : '💬 Click anywhere on the image to add edit marks.'}
                      </span>
                    </div>
                  )}

                  {/* TEMPORARY ACTIVE COORDINATE ANCHOR RING WITH FLOATING SETTINGS POPOVER */}
                  {tempCoordinate && (
                    <div 
                      style={{ left: `${tempCoordinate.x}%`, top: `${tempCoordinate.y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-auto"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Pulsing ring center point */}
                      <div className="relative w-8 h-8 rounded-full border-2 border-[#0e7a86] flex items-center justify-center bg-[#0e7a86]/10 shadow-[0_0_12px_rgba(14,122,134,0.45)]">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#0e7a86] animate-pulse" />
                      </div>

                      {/* Floating deluxe popover settings editor */}
                      <motion.div
                        initial={{ opacity: 0, scale: 0.93, y: tempCoordinate.y > 50 ? -12 : 12 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.93 }}
                        className={`absolute z-40 w-[300px] bg-white border border-stone-200 rounded-2xl p-4 shadow-[0_24px_64px_rgba(0,0,0,0.18)] flex flex-col gap-3.5 text-xs ${
                          tempCoordinate.y > 50 ? 'bottom-11' : 'top-11'
                        } ${
                          tempCoordinate.x > 50 ? 'right-0 origin-bottom-right translate-x-4' : 'left-0 origin-bottom-left -translate-x-4'
                        }`}
                      >
                        {/* Header */}
                        <div className="flex items-center justify-between pb-2 border-b border-stone-100 flex-shrink-0">
                          <span className="text-[10px] font-bold text-[#0e7a86] tracking-wider font-mono uppercase flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-[#0e7a86] animate-pulse" />
                            <span>{language === 'zh' ? '添加电商防伪批注' : 'Add Luxury Annotation'}</span>
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setTempCoordinate(null);
                            }}
                            className="p-1 hover:bg-stone-100 rounded text-stone-400 hover:text-stone-700 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Location Coordinate tag */}
                        <div className="text-[9px] text-[#0b616b] font-mono tracking-widest uppercase flex items-center justify-between">
                          <span>{language === 'zh' ? '锚点坐标' : 'Coordinate Anchor'}</span>
                          <span>X:{tempCoordinate.x}% / Y:{tempCoordinate.y}%</span>
                        </div>

                        {/* Quick Prompts suggestions Row */}
                        <div className="space-y-1.5">
                          <p className="text-[9.5px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                            {language === 'zh' ? '常用快捷修改词：' : 'Quick Presets:'}
                          </p>
                          <div className="flex flex-wrap gap-1 max-h-[85px] overflow-y-auto scrollbar-none">
                            {(language === 'zh' ? activeTemplate.promptSuggestions : (activeTemplate.promptSuggestions_en || activeTemplate.promptSuggestions)).map((sug, i) => (
                              <button 
                                key={i}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setNewAnnotationText(sug);
                                }}
                                className="px-2 py-1 text-[9.5px] font-semibold bg-stone-50 border border-stone-200/60 rounded-lg text-stone-600 hover:text-stone-900 hover:border-[#0e7a86] hover:bg-white transition-all truncate max-w-[136px]"
                              >
                                {sug}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Custom Instruction Box */}
                        <div className="space-y-1">
                          <p className="text-[9.5px] font-bold text-stone-400 uppercase tracking-widest font-mono">
                            {language === 'zh' ? '自定义微雕指令 (Wording)' : 'Custom Polish Wording'}
                          </p>
                          <textarea 
                            value={newAnnotationText}
                            onChange={(e) => setNewAnnotationText(e.target.value)}
                            className="w-full bg-[#fafafa] border border-stone-200 rounded-xl p-2.5 focus:outline-none focus:border-[#0e7a86] focus:bg-white text-xs text-[#121212] font-sans resize-none transition-colors"
                            rows={3}
                            placeholder={language === 'zh' ? '请输入修改细节，例如：将表面皮面材质更换为反光全息网格...' : 'Please enter refinement context here...'}
                          />
                        </div>



                        {/* Confirmation Button */}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmAnnotationNode();
                          }}
                          className="w-full py-2.5 bg-gradient-to-r from-[#0b4a52] via-[#0b616b] to-[#0e7a86] hover:brightness-110 text-white rounded-xl text-[11px] font-bold tracking-widest uppercase transition-all text-center shadow-[0_4px_12px_rgba(14,122,134,0.25)] flex items-center justify-center gap-1.5"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-yellow-105" />
                          <span>{language === 'zh' ? '确认并保存此批注' : 'Confirm & Save Annotation'}</span>
                        </button>
                      </motion.div>
                    </div>
                  )}

                </div>
              </div>

              {/* FLOATING ACTION CONTROL BAR CONTAINER */}
              <div className="mx-6 mb-6 px-6 py-3.5 bg-stone-900 border border-stone-800/80 rounded-2xl shadow-[0_20px_48px_rgba(0,0,0,0.3)] backdrop-blur-md flex flex-row items-center justify-between select-none gap-4 z-20 font-sans flex-nowrap overflow-x-auto scrollbar-none">
                <div className="flex items-center gap-3 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0e7a86] animate-pulse" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-[#0e7a86] font-mono tracking-widest font-extrabold uppercase leading-none">Atelier Desk</span>
                    <span className="text-[7px] text-stone-500 font-mono tracking-widest uppercase mt-0.5 leading-none">System Active</span>
                  </div>
                </div>
                
                <div className="flex flex-row items-center gap-3 shrink-0">
                  {/* BUTTON 1: 一键上传并自动配对样板 (Upload & Archive) with input restored */}
                  <div className="relative shrink-0">
                    <input 
                      type="file" 
                      id="hidden-template-uploader-input" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleTemplateFileInputChange} 
                    />
                    {!lastUploadedUserTemplate ? (
                      <button
                        type="button"
                        onClick={handleTriggerTemplateUpload}
                        className="py-2.5 px-4 bg-stone-850 hover:bg-[#0e7a86]/10 text-stone-200 hover:text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-stone-800 hover:border-[#0e7a86]/55 transition-all duration-205 cursor-pointer shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5 text-[#0e7a86] shrink-0" />
                        <span>{language === 'zh' ? '一键上传样板' : 'Upload Preset'}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentImage(lastUploadedUserTemplate.originalImage);
                          setUploadedTemplateFile(lastUploadedUserTemplate.originalImage);
                          setTemplateSourceType('file');
                          triggerToast(
                            language === 'zh'
                              ? `⚡️ 已套用并配对专属样板: ${lastUploadedUserTemplate.name}`
                              : `⚡️ Active and paired preset: ${lastUploadedUserTemplate.name}`,
                            'success'
                          );
                        }}
                        className="py-2.5 px-4 bg-stone-950 hover:bg-black text-[#fafafa] border border-[#0e7a86] rounded-xl text-xs flex items-center gap-2 transition-all duration-205 cursor-pointer relative overflow-hidden shadow-[0_0_12px_rgba(245,158,11,0.25)]"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#3aa0ab] shrink-0 animate-pulse relative z-10" />
                        <span className="relative z-10 truncate max-w-[130px]">
                          {language === 'zh' ? `已配对:${lastUploadedUserTemplate.name}` : `Active:${lastUploadedUserTemplate.name}`}
                        </span>
                      </button>
                    )}
                  </div>

                  {/* BUTTON 2: 一键平行生成四联方案 (Batch Generate 4 Styles in Parallel) */}
                  <button 
                    onClick={() => {
                      setShowBatchModal(true);
                      setIsBatchGenerating(true);
                      setTimeout(() => {
                        setBatchResults([
                          {
                            id: 'b1',
                            name: 'Travertine Luxury Gallery',
                            name_zh: '米黄罗马洞石高奢画廊背景',
                            image: activeTemplate.styleVariants.original,
                            style: 'Classic Gallery Minimalist',
                            style_zh: '流金古典雕琢'
                          },
                          {
                            id: 'b2',
                            name: 'Fluid Holographic Liquid Chrome',
                            name_zh: '液态全息流体高反光聚合物镀铬',
                            image: activeTemplate.styleVariants.variantB,
                            style: 'Cybermatic Holographic Chrome',
                            style_zh: '赛博流体力学材质'
                          },
                          {
                            id: 'b3',
                            name: 'Volumetric Sahara Dune Sand',
                            name_zh: '金色晨曦火山沙漠风质岩层',
                            image: activeTemplate.styleVariants.variantC,
                            style: 'Organic Sandscape Light & Shadow',
                            style_zh: '旷野大地微风光影'
                          },
                          {
                            id: 'b4',
                            name: 'Minimalist Alabastar Travertine Museum',
                            name_zh: '极简白羊脂玉石雕塑展示殿堂背景',
                            image: activeTemplate.styleVariants.original, 
                            style: 'Studio Architectural Muse',
                            style_zh: '象牙汉白玉石陈静'
                          }
                        ]);
                        setIsBatchGenerating(false);
                        triggerToast(language === 'zh' ? '✨ 一键4联高定风格批量生成完毕' : '✨ 4 Styles generated in Parallel');
                      }, 1600);
                    }}
                    className="py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-[#08363b] via-[#0b616b] to-[#0e7a86] hover:brightness-110 flex items-center gap-2 transition-all shadow-[0_4px_16px_rgba(29,78,216,0.25)] duration-205 cursor-pointer shrink-0"
                  >
                    <Grid className="w-3.5 h-3.5 text-[#a9dde2] shrink-0" />
                    <span>{language === 'zh' ? '一键生成四个方案' : 'Batch Generate 4'}</span>
                  </button>

                  {/* BUTTON 3: 下载图片 (Download) */}
                  <button 
                    onClick={() => triggerToast(language === 'zh' ? '🚀 高清画意底片打包下载开启' : 'Download triggered successfully.', 'success')}
                    className="py-2.5 px-4 bg-stone-800 hover:bg-stone-750 text-stone-200 hover:text-white font-bold rounded-xl text-xs flex items-center gap-2 border border-stone-700/60 shadow-sm transition-all duration-205 cursor-pointer shrink-0"
                  >
                    <Download className="w-3.5 h-3.5 text-[#0e7a86] shrink-0" />
                    <span>{language === 'zh' ? '下载高清图片' : 'Download Photo'} ({aspectRatio})</span>
                  </button>

                  <div className="w-px h-5 bg-stone-800 mx-1 hidden md:block shrink-0" />

                  {/* BUTTON 4: 开始智能修改 (Refine Action) */}
                  <button 
                    onClick={() => executeSimulationGen()}
                    disabled={isGenerating}
                    className="py-2.5 px-5 bg-white hover:bg-stone-100 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 rounded-xl text-xs flex items-center gap-2 font-black tracking-wider transition-all duration-205 shadow-md cursor-pointer shrink-0"
                  >
                    <Compass className="w-4 h-4 text-[#0b616b] shrink-0 animate-spin-slow" />
                    <span className="font-extrabold">{language === 'zh' ? '开始智能修改' : 'Start Refining'}</span>
                  </button>
                </div>
              </div>

            </section>

            {/* L3. RETRACTABLE RIGHT SIDEBAR: EXPERT SETTINGS & OFFCANVAS INTERACTIVE PLACEMENT ADJUSTMENT */}
            <AnimatePresence initial={false}>
              {rightSidebarOpen && (
                <motion.aside 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: 320, opacity: 1 }}
                  exit={{ width: 0, opacity: 0 }}
                  transition={{ type: "spring", damping: 30, stiffness: 220 }}
                  className="bg-white overflow-y-auto shrink-0 border-l border-stone-200/50 z-20"
                  id="right-settings-sidebar"
                >
                  <div className="p-6 space-y-6">

                      {/* Standard Studio Setting Guides */}
                      <div className="space-y-5">
                        
                        {/* Aspect Preset Selector */}
                        <div className="pb-4 border-b border-stone-100 space-y-2">
                          <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block mb-1">
                            {language === 'zh' ? '选择画面比例 与高定画幅' : 'Aspect Ratio & Atelier Bounds'}
                          </span>
                          <div className="relative">
                            <select 
                              value={aspectRatio}
                              onChange={(e) => {
                                setAspectRatio(e.target.value);
                                triggerToast(
                                  language === 'zh' 
                                    ? `已将画面比例切换为 ${e.target.value === 'original' ? '初始画面比例' : e.target.value}` 
                                    : `Aspect ratio changed to ${e.target.value === 'original' ? 'Original Aspect Ratio' : e.target.value}`,
                                  'info'
                                );
                              }}
                              className="w-full bg-[#fafafa] border border-stone-200 rounded-xl py-2.5 px-3 text-xs text-[#121212] focus:outline-none focus:border-[#0e7a86] font-semibold appearance-none cursor-pointer"
                            >
                              <option value="original">{language === 'zh' ? '📸 初始画面比例' : '📸 Original Aspect Ratio'}</option>
                              <option value="1:1">1:1 ({language === 'zh' ? '方形' : 'Square'})</option>
                              <option value="3:4">3:4 ({language === 'zh' ? '人像' : 'Portrait'})</option>
                              <option value="4:3">4:3 ({language === 'zh' ? '标准' : 'Standard'})</option>
                              <option value="9:16">9:16 ({language === 'zh' ? '手机' : 'Mobile'})</option>
                              <option value="16:9">16:9 ({language === 'zh' ? '横屏' : 'Wide'})</option>
                              <option value="2:3">2:3 ({language === 'zh' ? '人像/电商' : 'Portrait/Product'})</option>
                              <option value="3:2">3:2 ({language === 'zh' ? '横屏/摄影' : 'Landscape/Camera'})</option>
                              <option value="21:9">21:9 ({language === 'zh' ? '电影宽屏' : 'Cinematic'})</option>
                            </select>
                            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                              <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                            </div>
                          </div>
                        </div>

                        {/* Shading preset tuning */}
                        <div className="pb-4 border-b border-stone-100 space-y-3">
                          <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                            {language === 'zh' ? '艺术风格' : 'Style'}
                          </span>
                          <div className="flex flex-wrap gap-1.5 font-sans">
                            {['Studio Ambient', 'Warm Dune d’or', 'Cold Glacier Light', 'Tokyo Ginza Fog'].map((style) => (
                              <button 
                                key={style}
                                onClick={() => {
                                  setStylePreset(style);
                                  triggerToast(language === 'zh' ? `已切换风格：${style}` : `Style updated: ${style}`, 'info');
                                }}
                                className={`text-[10px] font-medium py-1 px-3 rounded-full transition-all cursor-pointer ${
                                  stylePreset === style 
                                    ? 'bg-[#121212] text-[#fafafa]' 
                                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                                  }`}
                              >
                                {style}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* VERSION HISTORY PLATFORM CONTROL */}
                        <div className="pb-4 border-b border-stone-100 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono flex items-center gap-1">
                              <History className="w-3 h-3 text-[#0e7a86]" />
                              <span>{language === 'zh' ? '版本控制历史' : 'Version History'}</span>
                            </span>
                            <span className="text-[7.5px] font-mono bg-[#eaf6f7] rounded border border-[#bfe3e6] text-[#0b616b] px-1.5 font-bold uppercase">Auto-Saved</span>
                          </div>

                          <div className="space-y-2 max-h-[145px] overflow-y-auto scrollbar-none">
                            {versionHistory.map((v, vIdx) => {
                              const isCurrent = currentImage === v.image;
                              return (
                                <div 
                                  key={v.id} 
                                  className={`p-2 rounded-lg border text-xs transition-all flex items-center justify-between ${
                                    isCurrent ? 'bg-[#0e7a86]/5 border-[#0e7a86]' : 'border-stone-100 bg-[#fafafa]/50 hover:bg-stone-50'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1 flex items-center gap-2">
                                    <img src={v.image} alt="hist" className="w-8 h-8 rounded object-cover border border-stone-200" />
                                    <div className="truncate min-w-0">
                                      <p className="font-bold text-[#121212] text-[10px] truncate">{language === 'zh' ? v.title : v.title_en}</p>
                                      <p className="text-[8px] font-mono text-stone-400 truncate mt-0.5">{v.timestamp} • {v.promptApplied || 'Original'}</p>
                                    </div>
                                  </div>

                                  {!isCurrent ? (
                                    <button
                                      onClick={() => {
                                        setCurrentImage(v.image);
                                        setAnnotations([...v.annotations]);
                                        triggerToast(
                                          language === 'zh' 
                                            ? `已成功回滚至：${v.title}` 
                                            : `Rollback successful to ${v.title_en}`, 
                                          'success'
                                        );
                                      }}
                                      className="py-1 px-2 border border-[#121212] text-[#121212] hover:bg-[#121212] hover:text-white rounded text-[8px] font-bold tracking-wider uppercase transition-colors"
                                    >
                                      {language === 'zh' ? '回退' : 'Roll'}
                                    </button>
                                  ) : (
                                    <span className="text-[8px] font-bold text-[#0e7a86] uppercase tracking-wider bg-[#0e7a86]/10 px-1.5 py-0.5 rounded">Active</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Active Revision stack workflow tracker */}
                        <div className="space-y-3 pt-2">
                          <div className="flex items-center justify-between font-sans">
                            <span className="text-[9px] font-bold text-[#0b616b] tracking-widest uppercase font-mono block">
                              {language === 'zh' ? '高定精细批注' : 'Marks Annotation'}
                            </span>
                            
                            {/* Filters pill toggles */}
                            <div className="flex bg-stone-100 p-0.5 rounded border border-stone-200 text-[8px] font-mono font-bold">
                              {(['all', 'pending', 'completed'] as any[]).map((pill) => (
                                <button
                                  key={pill}
                                  onClick={() => setAnnotationFilter(pill)}
                                  className={`px-1.5 py-0.5 rounded transition-all uppercase ${
                                    annotationFilter === pill 
                                      ? 'bg-white text-stone-900 shadow-sm' 
                                      : 'text-stone-400 hover:text-stone-600'
                                  }`}
                                >
                                  {pill === 'all' ? (language === 'zh' ? '全部' : 'All') :
                                   pill === 'pending' ? (language === 'zh' ? '等画雕' : 'Pend') :
                                   (language === 'zh' ? '完胜' : 'Done')}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Filtered annotations container */}
                          <div className="space-y-2 max-h-[175px] overflow-y-auto scrollbar-none pr-0.5">
                            {annotations.filter(ann => {
                              if (annotationFilter === 'pending') return ann.status === 'pending';
                              if (annotationFilter === 'completed') return ann.status === 'completed';
                              return true;
                            }).length === 0 ? (
                              <div className="text-center py-6 border border-dashed border-stone-200 rounded-xl bg-stone-50/50">
                                <HelpCircle className="w-4 h-4 text-[#0e7a86] mx-auto mb-1" />
                                <p className="text-[9.5px] font-serif italic text-stone-400">
                                  {language === 'zh' ? '无该状态对应的标记' : 'No matched nodes.'}
                                </p>
                              </div>
                            ) : (
                              annotations
                                .filter(ann => {
                                  if (annotationFilter === 'pending') return ann.status === 'pending';
                                  if (annotationFilter === 'completed') return ann.status === 'completed';
                                  return true;
                                })
                                .map((ann, i) => (
                                  <div 
                                    key={ann.id}
                                    onClick={() => {
                                      setActiveAnnotationId(ann.id);
                                      setTempCoordinate(null);
                                    }}
                                    className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
                                      activeAnnotationId === ann.id 
                                        ? 'border-[#0e7a86] bg-[#0e7a86]/5 text-[#121212]' 
                                        : 'border-stone-100 hover:border-stone-300 bg-[#fafafa]/20 text-[#121212]'
                                    }`}
                                  >
                                    {/* Direct mark checkout circle */}
                                    <input
                                      type="checkbox"
                                      checked={ann.status === 'completed'}
                                      onClick={(clickE) => clickE.stopPropagation()}
                                      onChange={() => {
                                        setAnnotations(prev => prev.map(a => a.id === ann.id ? { ...a, status: a.status === 'completed' ? 'pending' : 'completed' } : a));
                                        triggerToast(
                                          language === 'zh' 
                                            ? `已改签该批注状态：${ann.status === 'completed' ? '等待打磨' : '完美收官'}` 
                                            : `Status changed for bookmark node.`,
                                          'info'
                                        );
                                      }}
                                      className="w-3.5 h-3.5 mt-0.5 rounded accent-[#0e7a86] cursor-pointer"
                                    />

                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center justify-between mb-1 text-[9.5px]">
                                        <span className="font-semibold flex items-center gap-1 font-sans">
                                          <span className="font-mono text-[8px] uppercase text-[#0b616b]">{ann.category}</span>
                                        </span>
                                        <span className={`text-[8px] font-bold px-1 rounded uppercase ${
                                          ann.status === 'pending' ? 'bg-[#d3ebee] text-[#0b616b]' : 'bg-green-100 text-green-700'
                                        }`}>
                                          {ann.status === 'pending' ? (language === 'zh' ? '等画雕' : 'Pending') : (language === 'zh' ? '完成' : 'Done')}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-stone-600 line-clamp-1 italic font-serif leading-relaxed font-sans">
                                        {language === 'zh' ? (ann.label_zh || ann.label) : (ann.label_en || ann.label)}
                                      </p>
                                    </div>
                                  </div>
                                ))
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  </motion.aside>
                  )}
                </AnimatePresence>

                {/* Toggle Button for Right Sidebar */}
                <button 
                  onClick={() => setRightSidebarOpen(prev => !prev)}
                  className="absolute right-4 top-4 z-30 w-8 h-8 rounded-full border border-stone-200 bg-white flex items-center justify-center text-stone-500 hover:text-[#121212] transition-colors shadow-sm cursor-pointer"
                  title="Toggle Right Sidebar"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

        {/* VIEW 0: QUICK START DASHBOARD */}
        {activeTab === 'quickstart' && (
          <div
            className="w-full h-full overflow-y-auto bg-[#f2f2f3] px-5 sm:px-8 lg:px-14 py-8 lg:py-14"
            style={{ fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif' }}
          >
            <div className="max-w-5xl mx-auto">

              {/* Swiss hero headline */}
              <div className="mb-8 lg:mb-12">
                <span className="block text-[10px] lg:text-[11px] font-extrabold tracking-[0.32em] uppercase text-[#0e7a86] mb-3 lg:mb-4">FOTO Generative Studio</span>
                <h1 className="font-black uppercase leading-[0.9] tracking-[-0.035em] text-[#0a0a0a] text-[38px] sm:text-[58px] lg:text-[84px]">
                  {language === 'zh'
                    ? (<>欢迎使用<br /><span className="text-[#0e7a86]">FOTO 创图空间</span></>)
                    : (<>WELCOME TO<br /><span className="text-[#0e7a86]">FOTO STUDIO.</span></>)}
                </h1>
                <div className="mt-4 lg:mt-5 h-[6px] w-14 lg:w-20 bg-[#0a0a0a]" />
              </div>

              {/* Section label row */}
              <div className="flex items-end justify-between border-t-2 border-[#0a0a0a] pt-3 mb-3 lg:mb-4">
                <span className="text-[11px] lg:text-xs font-extrabold uppercase tracking-[0.18em] text-[#0a0a0a]">
                  {language === 'zh' ? '快速开始工作流' : 'Quick Start Workflows'}
                </span>
                <button
                  onClick={() => setActiveTab('templates')}
                  className="group inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-[#0e7a86] transition-all cursor-pointer"
                >
                  {language === 'zh' ? '浏览全部素材广场' : 'Explore Assets Plaza'}
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                </button>
              </div>

              {/* Swiss bento grid — one accent block + two stacked cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 lg:grid-rows-2 gap-3 lg:gap-4 lg:min-h-[460px]">

                {/* BIG ACCENT BLOCK — Product Campaign (Quick) */}
                <button
                  onClick={() => handleRemixTemplate('sneaker')}
                  className="group relative lg:row-span-2 bg-[#0e7a86] text-white text-left p-7 lg:p-10 overflow-hidden cursor-pointer flex flex-col min-h-[260px]"
                >
                  <div className="absolute -right-20 -top-12 w-72 h-72 rounded-full border border-white/20 pointer-events-none" />
                  <div className="absolute -right-32 top-24 w-72 h-72 rounded-full border border-white/10 pointer-events-none" />
                  <div className="relative mt-auto">
                    <h2 className="text-2xl lg:text-[34px] font-black tracking-tight leading-[1.05]">
                      {language === 'zh' ? '商品宣传图（快速）' : 'Product Campaign'}
                    </h2>
                    <p className="mt-3 text-[13px] lg:text-sm text-white/75 leading-relaxed max-w-sm">
                      {language === 'zh' ? '上传一张商品图，快速套用单一 AI 宣传图工作流。' : 'Launch the AI engine with full parameter control and high-fidelity output.'}
                    </p>
                  </div>
                  <div className="relative mt-6 flex justify-end">
                    <span className="w-12 h-12 border border-white/40 flex items-center justify-center group-hover:bg-white group-hover:text-[#0e7a86] transition-colors duration-300">
                      <ArrowRight className="w-5 h-5" />
                    </span>
                  </div>
                </button>

                {/* WHITE CARD — Model Try-On */}
                <button
                  onClick={() => handleRemixTemplate('luxury_bag')}
                  className="group relative bg-white text-left p-6 lg:p-7 cursor-pointer flex items-start gap-4 hover:bg-stone-50 transition-colors min-h-[150px]"
                >
                  <div className="w-11 h-11 rounded-md bg-[#0e7a86]/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-[#0e7a86]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg lg:text-xl font-black tracking-tight text-[#0a0a0a]">
                      {language === 'zh' ? '模特试穿图' : 'Model Try-On'}
                    </h3>
                    <p className="mt-1.5 text-[12.5px] lg:text-[13px] text-stone-500 leading-relaxed">
                      {language === 'zh' ? '上传商品图，选择系统 / 虚拟 / 自定义模特，一键生成试穿大片。' : 'Pick a system, virtual, or custom model and generate the shoot.'}
                    </p>
                  </div>
                  <ArrowUpRight className="w-5 h-5 text-stone-300 group-hover:text-[#0e7a86] transition-colors shrink-0" />
                </button>

                {/* DARK IMAGE CARD — Custom Campaign */}
                <button
                  onClick={() => handleRemixTemplate('cosmetic')}
                  className="group relative bg-[#0a0a0a] text-left overflow-hidden cursor-pointer flex items-end p-6 lg:p-7 min-h-[170px]"
                >
                  <img
                    src={(templates.find(t => t.id === 'cosmetic') || INITIAL_TEMPLATES.find(t => t.id === 'cosmetic'))?.originalImage}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover opacity-45 group-hover:opacity-60 group-hover:scale-105 transition-all duration-[600ms] ease-out"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
                  <div className="relative z-10">
                    <h3 className="text-lg lg:text-xl font-black text-white tracking-tight">
                      {language === 'zh' ? '商品宣传图（定制）' : 'Custom Campaign'}
                    </h3>
                    <span className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] lg:text-xs font-bold text-white/75 uppercase tracking-wider">
                      {language === 'zh' ? '浏览合集' : 'View Collection'}
                      <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
                    </span>
                  </div>
                </button>
              </div>

            </div>
          </div>
        )}

        {/* VIEW 2: SMART HIGH-FIDELITY TEMPLATES DIRECTORY */}
        {activeTab === 'templates' && (
          <div ref={templatesRef} className="w-full h-full overflow-y-auto bg-white">
            <div className="max-w-[1180px] mx-auto px-4 md:px-10 py-6 md:py-10 space-y-10 md:space-y-12 font-sans">
              {(() => {
                const real = templates.filter((t) => !t.isUserTemplate);
                const slide = heroSlides[heroSlide] ?? heroSlides[0];
                const slideIds = new Set(heroSlides.map((s) => s.id));
                const hot = real.filter((t) => !slideIds.has(t.id)).slice(0, 3);
                const filtered = templates.filter((tpl) => {
                  if (selectedCategoryFilter === 'all') return !tpl.isUserTemplate;
                  if (selectedCategoryFilter === 'custom') return tpl.isUserTemplate;
                  if (selectedSubcategoryFilter !== 'all') {
                    return tpl.category === selectedCategoryFilter && tpl.subcategory === selectedSubcategoryFilter && !tpl.isUserTemplate;
                  }
                  return tpl.category === selectedCategoryFilter && !tpl.isUserTemplate;
                });

                return (
                  <>
                    {/* ROW 1 — Spotlight + Hot Remixes */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Spotlight hero */}
                      <div
                        onMouseEnter={() => setIsHeroHovered(true)}
                        onMouseLeave={() => setIsHeroHovered(false)}
                        className="ap-enter ap-hero group lg:col-span-2 relative rounded-2xl overflow-hidden min-h-[400px] bg-[#0c0c0e] cursor-pointer select-none"
                      >
                        <img
                          src={slide?.originalImage}
                          alt=""
                          className="ap-hero-img absolute inset-0 w-full h-full object-cover scale-[1.12] opacity-[0.7]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c0e] via-[#0c0c0e]/70 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e]/70 to-transparent" />
                        <div className="ap-hero-content relative z-10 h-full flex flex-col justify-center gap-5 p-9 md:p-11 max-w-lg">
                          <span className="inline-flex items-center gap-1.5 self-start pl-2.5 pr-3 py-1 rounded-full bg-[#0e7a86]/15 border border-[#0e7a86]/30 text-[#9ed8de] text-[9.5px] font-bold tracking-[0.18em] uppercase backdrop-blur-sm">
                            <TrendingUp className="w-3 h-3" />
                            {language === 'zh' ? '本周精选主题' : 'Trending Theme'}
                          </span>
                          <h1 className="text-3xl md:text-[40px] font-bold tracking-tight text-white leading-[1.08]">
                            {language === 'zh' ? (slide?.chineseName || slide?.name) : slide?.name}
                          </h1>
                          <p className="text-[13px] text-white/55 leading-relaxed max-w-md font-light">
                            {language === 'zh' ? (slide?.description_zh || slide?.description) : (slide?.description_en || slide?.description)}
                          </p>
                          <div className="flex items-center gap-3 pt-1">
                            <button
                              onClick={() => slide && handleRemixTemplate(slide.id)}
                              className="inline-flex items-center gap-2 pl-6 pr-6 py-3 rounded-xl bg-white text-[#0c0c0e] text-xs font-bold tracking-wide hover:gap-3 hover:bg-white/90 transition-all cursor-pointer"
                            >
                              {language === 'zh' ? '探索合集' : 'Explore Collection'}
                            </button>
                            <button
                              onClick={() => setHeroSlide((s) => (s + 1) % heroSlides.length)}
                              className="w-11 h-11 rounded-xl border border-white/25 flex items-center justify-center text-white hover:bg-white/10 hover:border-white/40 transition-all cursor-pointer shrink-0"
                              title={language === 'zh' ? '下一张' : 'Next slide'}
                            >
                              <ArrowRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Pagination dots */}
                        <div className="absolute bottom-7 right-8 z-20 flex items-center gap-2">
                          {heroSlides.map((s, i) => (
                            <button
                              key={s.id}
                              onClick={() => setHeroSlide(i)}
                              aria-label={`Slide ${i + 1}`}
                              className={`h-1.5 rounded-full transition-all duration-300 cursor-pointer ${
                                i === heroSlide ? 'w-6 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Hot Remixes */}
                      <div className="flex flex-col gap-3">
                        <div className="ap-enter flex items-center justify-between px-1">
                          <span className="flex items-center gap-1.5 text-sm font-bold text-[#121212] tracking-tight">
                            <Zap className="w-4 h-4 text-[#0e7a86] fill-[#0e7a86]" />
                            {language === 'zh' ? '热门混编' : 'Hot Remixes'}
                          </span>
                          <button
                            onClick={() => { setSelectedCategoryFilter('all'); setSelectedSubcategoryFilter('all'); }}
                            className="text-[10px] font-bold text-[#0e7a86] tracking-wide hover:underline cursor-pointer"
                          >
                            {language === 'zh' ? '查看全部' : 'View All'}
                          </button>
                        </div>
                        {hot.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => handleRemixTemplate(t.id)}
                            className="ap-enter ap-hot group relative flex-1 min-h-[110px] rounded-xl overflow-hidden text-left cursor-pointer"
                          >
                            <img src={t.originalImage} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
                            <div className="relative z-10 h-full flex flex-col justify-end p-4 gap-1.5">
                              <span className="self-start px-2 py-0.5 rounded-md bg-white/90 text-[#121212] text-[8px] font-bold tracking-[0.14em] uppercase">
                                {catLabel(t.category)}
                              </span>
                              <span className="text-[13px] font-bold text-white tracking-tight leading-tight line-clamp-1">
                                {language === 'zh' ? (t.chineseName || t.name) : t.name}
                              </span>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* ROW 2 — Categories + Trending Workflows */}
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                      {/* Categories card */}
                      <aside className="ap-enter lg:col-span-1 h-fit rounded-2xl border border-stone-200/70 bg-white p-4 space-y-1 shadow-[0_2px_24px_rgba(0,0,0,0.025)]">
                        <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-3">
                          <SlidersHorizontal className="w-3.5 h-3.5 text-stone-400" />
                          <span className="text-[10px] font-bold tracking-[0.18em] uppercase text-stone-400">
                            {language === 'zh' ? '类目' : 'Categories'}
                          </span>
                        </div>

                        {/* All Specs */}
                        <button
                          onClick={() => { setSelectedCategoryFilter('all'); setSelectedSubcategoryFilter('all'); }}
                          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
                            selectedCategoryFilter === 'all'
                              ? 'bg-[#0e7a86] text-white font-semibold shadow-sm shadow-[#0e7a86]/25'
                              : 'text-stone-600 hover:bg-stone-50'
                          }`}
                        >
                          <span className="flex items-center gap-2 text-xs tracking-wide">
                            <Grid className="w-3.5 h-3.5" />
                            {language === 'zh' ? '全部样板' : 'All Specs'}
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${selectedCategoryFilter === 'all' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                            {real.length}
                          </span>
                        </button>

                        {/* My Vault */}
                        {templates.some((t) => t.isUserTemplate) && (
                          <button
                            onClick={() => { setSelectedCategoryFilter('custom'); setSelectedSubcategoryFilter('all'); }}
                            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all cursor-pointer text-left ${
                              selectedCategoryFilter === 'custom'
                                ? 'bg-[#0e7a86] text-white font-semibold shadow-sm shadow-[#0e7a86]/25'
                                : 'text-stone-600 hover:bg-stone-50'
                            }`}
                          >
                            <span className="flex items-center gap-2 text-xs tracking-wide">
                              <Star className={`w-3.5 h-3.5 ${selectedCategoryFilter === 'custom' ? 'fill-white' : 'fill-[#0e7a86] text-[#0e7a86]'}`} />
                              {language === 'zh' ? '我的高定' : 'My Vault'}
                            </span>
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${selectedCategoryFilter === 'custom' ? 'bg-white/20 text-white' : 'bg-stone-100 text-stone-500'}`}>
                              {templates.filter((t) => t.isUserTemplate).length}
                            </span>
                          </button>
                        )}

                        <div className="h-px bg-stone-100 my-2 mx-1" />

                        {/* Category accordion */}
                        {CATEGORY_MAP.map((cat) => {
                          const isActiveCategory = selectedCategoryFilter === cat.id;
                          const catCount = templates.filter((t) => t.category === cat.id && !t.isUserTemplate).length;
                          return (
                            <div key={cat.id}>
                              <button
                                onClick={() => { setSelectedCategoryFilter(cat.id); setSelectedSubcategoryFilter('all'); }}
                                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-left cursor-pointer ${
                                  isActiveCategory ? 'text-[#0e7a86] font-semibold bg-[#eaf6f7]/60' : 'text-stone-700 hover:bg-stone-50'
                                }`}
                              >
                                <span className="flex items-center gap-1.5 text-xs tracking-wide truncate">
                                  <ChevronRight className={`w-3 h-3 transition-transform duration-300 ${isActiveCategory ? 'rotate-90 text-[#0e7a86]' : 'text-stone-300'}`} />
                                  {language === 'zh' ? cat.name_zh : cat.name_en}
                                </span>
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${isActiveCategory ? 'bg-[#0e7a86]/10 text-[#0e7a86]' : 'bg-stone-100 text-stone-400'}`}>
                                  {catCount}
                                </span>
                              </button>

                              {isActiveCategory && cat.subcategories && cat.subcategories.length > 0 && (
                                <div className="ml-5 pl-2.5 my-1 space-y-0.5 border-l border-stone-100">
                                  {cat.subcategories.map((sub) => {
                                    const isActiveSub = selectedSubcategoryFilter === sub.id;
                                    const subCount = templates.filter((t) => t.subcategory === sub.id && !t.isUserTemplate).length;
                                    return (
                                      <button
                                        key={sub.id}
                                        onClick={() => { setSelectedCategoryFilter(cat.id); setSelectedSubcategoryFilter(sub.id); }}
                                        className={`w-full flex items-center justify-between py-1.5 px-3 rounded-lg transition-all text-left cursor-pointer text-[11px] ${
                                          isActiveSub ? 'text-[#0e7a86] font-semibold' : 'text-stone-400 hover:text-stone-700'
                                        }`}
                                      >
                                        <span className="truncate">{language === 'zh' ? sub.name_zh : sub.name_en}</span>
                                        <span className="text-[9px] font-mono text-stone-300">{subCount}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </aside>

                      {/* Trending Workflows */}
                      <div className="lg:col-span-3 space-y-5">
                        <div className="ap-enter flex items-end justify-between">
                          <h3 className="flex items-center gap-2 text-xl font-bold text-[#121212] tracking-tight">
                            <Flame className="w-5 h-5 text-[#0e7a86]" />
                            {language === 'zh' ? '热门工作流' : 'Trending Workflows'}
                          </h3>
                          <span className="text-[11px] text-stone-400 font-medium font-mono">
                            {filtered.length} {language === 'zh' ? '套样板' : 'specs'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                          {filtered.map((tpl) => (
                            <button
                              key={tpl.id}
                              onClick={() => handleRemixTemplate(tpl.id)}
                              className="ap-card group relative rounded-2xl overflow-hidden text-left cursor-pointer aspect-[16/11] bg-[#0c0c0e]"
                            >
                              <img
                                src={tpl.originalImage}
                                alt={tpl.name}
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-105"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                              <div className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/95 text-[#121212] flex items-center justify-center opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 shadow-lg">
                                <ArrowUpRight className="w-4 h-4" />
                              </div>
                              <div className="absolute inset-x-0 bottom-0 p-4 space-y-1.5">
                                <span className="block text-[9px] font-bold tracking-[0.18em] uppercase text-white/65">
                                  {catLabel(tpl.category)}
                                </span>
                                <h4 className="text-base font-bold text-white tracking-tight leading-tight line-clamp-2">
                                  {language === 'zh' ? (tpl.chineseName || tpl.name) : tpl.name}
                                </h4>
                              </div>
                            </button>
                          ))}

                          {filtered.length === 0 && (
                            <div className="sm:col-span-2 lg:col-span-3 border-2 border-dashed border-stone-100 rounded-2xl py-16 flex flex-col items-center justify-center text-center space-y-2">
                              <FolderOpen className="w-8 h-8 text-stone-300 stroke-1" />
                              <h4 className="text-xs font-semibold text-stone-500">{language === 'zh' ? '暂未检索到该子类的极奢参考样板' : 'No specimens found'}</h4>
                              <p className="text-[10px] text-stone-400 max-w-sm">{language === 'zh' ? '该细分类目暂未固化预制参考切片，支持您在工作台导入本地实拍、进行打点保存。' : 'No presets under this specific category.'}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}


        {/* VIEW 3.5: WORKFLOW REMIX ENTRY — upload your product into the chosen workflow */}
        {activeTab === 'remix' && (
          <div ref={remixRef} className="w-full h-full overflow-y-auto bg-white">
            <div className="max-w-[1180px] mx-auto px-4 md:px-12 py-6 md:py-9 font-sans">
              {/* Back — returns to whichever tab launched this view */}
              <button
                onClick={() => setActiveTab(remixOrigin)}
                className="rx-enter group inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-md text-stone-500 hover:text-[#121212] hover:bg-stone-100/70 transition-all cursor-pointer text-[13px] font-semibold tracking-tight"
              >
                <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
                {remixOrigin === 'quickstart'
                  ? (language === 'zh' ? '返回快速开始' : 'Back to Quick Start')
                  : (language === 'zh' ? '返回素材广场' : 'Back to Assets Plaza')}
              </button>

              {remixIsTryon(activeTemplate) ? (() => {
                const ageLabel = VM_AGES.find((a) => a.id === vmAge) || VM_AGES[1];
                const ethLabel = VM_ETHNICITIES.find((x) => x.id === vmEthnicity) || VM_ETHNICITIES[0];
                const genLabel = VM_GENDERS.find((g) => g.id === vmGender) || VM_GENDERS[0];
                const sysModel = SYSTEM_MODELS.find((m) => m.id === tryonSystemModelId) || SYSTEM_MODELS[0];
                const sourceIndex = tryonSource === 'system' ? 0 : tryonSource === 'virtual' ? 1 : 2;
                const sources: { id: 'system' | 'virtual' | 'upload'; zh: string; en: string; icon: React.ReactNode }[] = [
                  { id: 'system', zh: '系统模特', en: 'System', icon: <Users className="w-3.5 h-3.5" /> },
                  { id: 'virtual', zh: '虚拟模特', en: 'Virtual', icon: <Wand2 className="w-3.5 h-3.5" /> },
                  { id: 'upload', zh: '上传模特', en: 'Upload', icon: <UserPlus className="w-3.5 h-3.5" /> },
                ];
                const modelSummary = tryonSource === 'system'
                  ? (language === 'zh' ? sysModel.name_zh : sysModel.name_en)
                  : tryonSource === 'virtual'
                    ? (language === 'zh' ? `${ethLabel.zh}${ageLabel.zh}${genLabel.zh}` : `${ageLabel.en} ${ethLabel.en} ${genLabel.en}`)
                    : (remixUploads[2] ? (language === 'zh' ? '已上传' : 'Uploaded') : (language === 'zh' ? '待上传' : 'Pending'));
                const recipe = [
                  { label: language === 'zh' ? '商品' : 'Product', value: remixUploads[0] ? (language === 'zh' ? '已上传' : 'Ready') : (language === 'zh' ? '待上传' : 'Pending'), set: Boolean(remixUploads[0]) },
                  { label: language === 'zh' ? '模特' : 'Model', value: modelSummary, set: true },
                  { label: language === 'zh' ? '场景' : 'Scene', value: tryonAutoMatch ? (language === 'zh' ? '自动' : 'Auto') : (language === 'zh' ? '手动' : 'Manual'), set: true },
                  { label: language === 'zh' ? '备注' : 'Note', value: tryonNote ? (language === 'zh' ? '已填' : 'Added') : (language === 'zh' ? '无' : 'None'), set: Boolean(tryonNote) },
                ];
                return (
                <div className="mt-7 space-y-7">
                  {/* Header */}
                  <div className="rx-enter flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-3.5">
                      <span className="w-11 h-11 rounded-lg bg-[#121212] text-white flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5" />
                      </span>
                      <div>
                        <span className="block text-[9.5px] font-bold tracking-[0.22em] uppercase text-[#0e7a86] font-mono">
                          Model Try-On · {catLabel(activeTemplate.category)}
                        </span>
                        <h2 className="text-2xl font-bold tracking-tight text-[#121212] leading-tight mt-0.5">
                          {language === 'zh' ? '为商品搭配 AI 模特' : 'Dress your product on an AI model'}
                        </h2>
                        <p className="text-[12px] text-stone-400 font-light mt-0.5">
                          {language === 'zh' ? '上传商品图，选择模特来源，一键生成试穿大片' : 'Upload the product, pick a model source, generate the shoot'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={resetTryon}
                      className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-stone-400 hover:text-[#121212] hover:bg-stone-100 transition-all text-[11.5px] font-semibold cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 transition-transform group-hover:-rotate-45" />
                      {language === 'zh' ? '重置参数' : 'Reset'}
                    </button>
                  </div>

                  {/* Main grid: uploads + model parameters */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                    {/* Product upload (required) */}
                    <div className="rx-enter order-2 lg:order-none lg:col-span-4 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-bold text-[#121212] tracking-tight">{language === 'zh' ? '商品图片' : 'Product Image'}</span>
                        <span className="text-red-500 text-sm leading-none">*</span>
                        <span className={`ml-auto text-[10px] font-mono ${tryonProductError ? 'text-red-500 font-bold' : 'text-stone-400'}`}>{language === 'zh' ? '必填' : 'Required'}</span>
                      </div>
                      <div className="tryon-product-zone flex-1 flex flex-col">
                        {remixGeneratedImage
                          ? renderResultPreview('min-h-[320px] flex-1 rounded-lg')
                          : renderTryonSlot(0, { minHClass: 'min-h-[320px] flex-1', hint: (language === 'zh' ? '支持 JPG / PNG / WebP' : 'JPG · PNG · WebP'), error: tryonProductError })}
                      </div>
                    </div>

                    {/* Style reference (optional) */}
                    <div className="rx-enter order-3 lg:order-none lg:col-span-3 flex flex-col gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[12.5px] font-bold text-[#121212] tracking-tight">{language === 'zh' ? '风格参考' : 'Style Reference'}</span>
                        <span className="text-[10px] text-stone-400 font-medium">{language === 'zh' ? '可选' : 'Optional'}</span>
                      </div>
                      {renderTryonSlot(1, { minHClass: 'min-h-[320px] flex-1', hint: null })}
                      <p className="flex items-center gap-1.5 text-[10.5px] text-stone-400 font-light">
                        <Info className="w-3 h-3 shrink-0" />
                        {language === 'zh' ? '仅用于学习风格，不直接出现在结果中' : 'Used only to learn the style'}
                      </p>
                    </div>

                    {/* Parameters panel */}
                    <div className="rx-enter order-1 lg:order-none lg:col-span-5 rounded-lg border border-stone-200/80 bg-white p-5 md:p-6 shadow-[0_2px_10px_rgba(15,23,42,0.035)] flex flex-col gap-5">
                      {/* Model source segmented control */}
                      <div className="space-y-3">
                        <span className="hidden lg:block text-[9px] font-mono font-bold tracking-[0.22em] uppercase text-stone-400">{language === 'zh' ? '模特来源' : 'Model Source'}</span>
                        <div className="relative flex p-1 rounded-lg bg-stone-100/80">
                          <div className="absolute inset-1 pointer-events-none">
                            <div
                              className="h-full w-1/3 rounded-md bg-white shadow-sm transition-transform duration-300 ease-out"
                              style={{ transform: `translateX(${sourceIndex * 100}%)` }}
                            />
                          </div>
                          {sources.map((s) => (
                            <button
                              key={s.id}
                              onClick={() => setTryonSource(s.id)}
                              className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-[12px] font-bold tracking-tight transition-colors cursor-pointer ${tryonSource === s.id ? 'text-[#0e7a86]' : 'text-stone-400 hover:text-stone-600'}`}
                            >
                              {s.icon}
                              {language === 'zh' ? s.zh : s.en}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Source body (crossfades on switch) */}
                      <div className="tryon-panel-body flex-1 min-h-[244px]">
                        {tryonSource === 'system' && (
                          <div className="space-y-2.5">
                            <span className="lg:hidden block text-[12.5px] font-bold text-[#121212] tracking-tight">{language === 'zh' ? '选择模特' : 'Choose a model'}</span>
                            <div className="group/gal flex gap-2.5 overflow-x-auto pb-1 -mx-1 px-1 snap-x scrollbar-none lg:grid lg:grid-cols-3 lg:overflow-visible lg:mx-0 lg:px-0 lg:pb-0">
                              {SYSTEM_MODELS.map((m) => {
                                const active = tryonSystemModelId === m.id;
                                return (
                                  <button
                                    key={m.id}
                                    onClick={() => setTryonSystemModelId(m.id)}
                                    className={`group/m relative shrink-0 w-[40%] sm:w-[31%] lg:w-auto snap-start aspect-[3/4] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-0.5 lg:group-hover/gal:opacity-[0.55] lg:hover:!opacity-100 ${active ? '!opacity-100 ring-1 ring-[#0e7a86]' : 'ring-1 ring-stone-200/70'}`}
                                  >
                                    <img src={m.thumbnail} alt={language === 'zh' ? m.name_zh : m.name_en} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover/m:scale-105" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" />
                                    <span className="absolute left-2 bottom-1.5 text-[9.5px] font-bold text-white drop-shadow">{language === 'zh' ? m.name_zh : m.name_en}</span>
                                    {active && (
                                      <span className="absolute right-1.5 top-1.5 w-5 h-5 rounded-sm bg-[#0e7a86] text-white flex items-center justify-center shadow">
                                        <Check className="w-3 h-3" strokeWidth={3} />
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => triggerToast(language === 'zh' ? '更多系统模特即将上线' : 'More system models coming soon', 'info')}
                                className="shrink-0 w-[40%] sm:w-[31%] lg:w-auto snap-start aspect-[3/4] rounded-lg border border-stone-200 flex flex-col items-center justify-center gap-1.5 text-stone-400 hover:border-[#0e7a86]/40 hover:text-[#0e7a86] hover:bg-stone-50/60 transition-all cursor-pointer"
                              >
                                <Grid className="w-4 h-4" />
                                <span className="text-[9.5px] font-bold">{language === 'zh' ? '查看全部' : 'View All'}</span>
                              </button>
                            </div>
                          </div>
                        )}

                        {tryonSource === 'virtual' && (
                          <div className="space-y-4">
                            <div className="space-y-1.5">
                              <span className="text-[10.5px] font-bold text-stone-500">{language === 'zh' ? '性别' : 'Gender'}</span>
                              <div className="grid grid-cols-2 gap-2">
                                {VM_GENDERS.map((g) => (
                                  <button
                                    key={g.id}
                                    onClick={() => setVmGender(g.id)}
                                    className={`py-2.5 rounded-md text-[12px] font-bold border transition-all cursor-pointer ${vmGender === g.id ? 'border-[#0e7a86] bg-[#0e7a86]/5 text-[#0e7a86]' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}
                                  >
                                    {language === 'zh' ? g.zh : g.en}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10.5px] font-bold text-stone-500">{language === 'zh' ? '年龄' : 'Age'}</span>
                              <div className="flex flex-wrap gap-2">
                                {VM_AGES.map((a) => (
                                  <button
                                    key={a.id}
                                    onClick={() => setVmAge(a.id)}
                                    className={`px-3.5 py-1.5 rounded-md text-[11.5px] font-semibold border transition-all cursor-pointer ${vmAge === a.id ? 'border-[#0e7a86] bg-[#0e7a86] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}
                                  >
                                    {language === 'zh' ? a.zh : a.en}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-1.5">
                              <span className="text-[10.5px] font-bold text-stone-500">{language === 'zh' ? '人种' : 'Ethnicity'}</span>
                              <div className="flex flex-wrap gap-2">
                                {VM_ETHNICITIES.map((x) => (
                                  <button
                                    key={x.id}
                                    onClick={() => setVmEthnicity(x.id)}
                                    className={`px-3.5 py-1.5 rounded-md text-[11.5px] font-semibold border transition-all cursor-pointer ${vmEthnicity === x.id ? 'border-[#0e7a86] bg-[#0e7a86] text-white' : 'border-stone-200 text-stone-500 hover:border-stone-300'}`}
                                  >
                                    {language === 'zh' ? x.zh : x.en}
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 rounded-md bg-stone-50 border border-stone-100 px-3.5 py-3">
                              <Sparkles className="w-3.5 h-3.5 text-[#0e7a86] shrink-0" />
                              <p className="text-[11.5px] text-stone-500 font-light">
                                {language === 'zh'
                                  ? <>将生成一位 <span className="font-bold text-[#121212]">{ethLabel.zh}{ageLabel.zh}{genLabel.zh}</span> 模特</>
                                  : <>Generating a <span className="font-bold text-[#121212]">{ageLabel.en.toLowerCase()} {ethLabel.en} {genLabel.en.toLowerCase()}</span> model</>}
                              </p>
                            </div>
                          </div>
                        )}

                        {tryonSource === 'upload' && (
                          <div className="flex flex-col gap-2.5">
                            {renderTryonSlot(2, { minHClass: 'min-h-[200px]', hint: (language === 'zh' ? '上传你自己的模特照片' : 'Upload your own model photo') })}
                            <p className="flex items-center gap-1.5 text-[10.5px] text-stone-400 font-light">
                              <Info className="w-3 h-3 shrink-0" />
                              {language === 'zh' ? '建议正面、光线均匀的全身或半身像' : 'Front-facing, evenly lit full or half body works best'}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Auto-match environment */}
                      <div className="flex items-center justify-between gap-3 border-t border-stone-100 pt-4">
                        <div className="min-w-0">
                          <p className="text-[12px] font-bold text-[#121212] tracking-tight">{language === 'zh' ? '自动匹配场景' : 'Auto-match Environment'}</p>
                          <p className="text-[10.5px] text-stone-400 font-light">{language === 'zh' ? 'AI 分析商品自动推荐拍摄场景' : 'AI analyzes product to suggest scenes'}</p>
                        </div>
                        <button
                          role="switch"
                          aria-checked={tryonAutoMatch}
                          onClick={() => setTryonAutoMatch((v) => !v)}
                          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 cursor-pointer ${tryonAutoMatch ? 'bg-[#0e7a86]' : 'bg-stone-200'}`}
                        >
                          <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${tryonAutoMatch ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>

                      {/* AI note — always expanded, clearly optional */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MessageSquarePlus className="w-3.5 h-3.5 text-[#0e7a86]" />
                          <span className="text-[11.5px] font-bold text-[#121212] tracking-tight">{language === 'zh' ? 'AI 备注' : 'Note for the AI'}</span>
                          <span className="px-2 py-0.5 rounded-md bg-[#0e7a86]/10 text-[#0e7a86] text-[9.5px] font-bold tracking-wide uppercase">{language === 'zh' ? '可选' : 'Optional'}</span>
                          <span className="ml-auto text-[10px] text-stone-400 font-light">{language === 'zh' ? '不填也可以生成' : 'Leave blank if not needed'}</span>
                        </div>
                        <textarea
                          value={tryonNote}
                          onChange={(e) => setTryonNote(e.target.value)}
                          rows={2}
                          placeholder={language === 'zh' ? '例如：希望模特微笑、四分之三侧身、暖色调灯光…' : 'e.g. smiling model, three-quarter pose, warm lighting…'}
                          className="w-full resize-none rounded-md border border-stone-200 bg-stone-50/50 px-3 py-2 text-[12px] text-[#121212] placeholder:text-stone-400 focus:outline-none focus:border-[#0e7a86]/50 focus:bg-white transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Hidden file input (shared across slots) */}
                  <input ref={remixInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { acceptRemixFile(remixPickSlotRef.current, e.target.files?.[0]); e.target.value = ''; }} />
                  <input ref={remixCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { acceptRemixFile(remixPickSlotRef.current, e.target.files?.[0]); e.target.value = ''; }} />

                  {/* Live creation recipe + CTA */}
                  <div className="rx-enter pt-5 border-t border-stone-200/70 flex flex-col gap-4">
                    <div className="flex items-center flex-wrap gap-y-2">
                      {recipe.map((r, i) => (
                        <React.Fragment key={r.label}>
                          {i > 0 && <span className="mx-2.5 h-px w-5 bg-stone-200" />}
                          <span className="inline-flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full transition-colors ${r.set ? 'bg-[#0e7a86]' : 'bg-stone-300'}`} />
                            <span className="text-[11px] text-stone-400">{r.label}</span>
                            <span className="text-[11px] font-semibold text-[#121212]">{r.value}</span>
                          </span>
                        </React.Fragment>
                      ))}
                    </div>

                    {remixGeneratedImage || remixIsGenerating ? (
                      renderGeneratedActions('dark')
                    ) : (
                      <button
                        onClick={handleTryonGenerate}
                        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-lg text-sm font-bold tracking-tight transition-all bg-[#0e7a86] text-white hover:brightness-110 shadow-[0_8px_24px_rgba(14,122,134,0.25)] cursor-pointer"
                      >
                        <Wand2 className="w-4 h-4" />
                        {language === 'zh' ? '直接生成 AI 模特图' : 'Generate AI Model Image'}
                      </button>
                    )}
                  </div>
                </div>
                );
              })() : remixHasStylePicker(activeTemplate) ? (() => {
                const ready = Boolean(remixUploads[0]);
                const campaignFields = [
                  {
                    id: 'productName' as const,
                    label: language === 'zh' ? '产品名称' : 'Product Name',
                    placeholder: language === 'zh' ? '例如：The Body Lotion' : 'e.g., The Body Lotion',
                    value: customCampaignMeta.productName
                  },
                  {
                    id: 'companyName' as const,
                    label: language === 'zh' ? '公司名称' : 'Company Name',
                    placeholder: language === 'zh' ? '例如：Nécessaire' : 'e.g., Nécessaire',
                    value: customCampaignMeta.companyName
                  },
                  {
                    id: 'productPrice' as const,
                    label: language === 'zh' ? '产品价格' : 'Product Price',
                    placeholder: language === 'zh' ? '例如：€48 / ¥399' : 'e.g., €48 / $52',
                    value: customCampaignMeta.productPrice
                  },
                  {
                    id: 'notes' as const,
                    label: language === 'zh' ? '备注' : 'Notes',
                    placeholder: language === 'zh' ? '例如：干净、有机、冷调质感…' : 'Clean, organic vibe...',
                    value: customCampaignMeta.notes
                  }
                ];

                return (
              <div className="mt-7 grid grid-cols-1 xl:grid-cols-[minmax(0,650px)_minmax(360px,1fr)] gap-10 xl:gap-12 items-start">
                {/* Swiss campaign reference */}
                <section className="rx-enter relative min-h-[600px] xl:min-h-[720px] bg-stone-900 overflow-hidden select-none">
                  <img
                    src={remixGeneratedImage || activeTemplate.originalImage}
                    alt=""
                    className={`rx-hero-img absolute inset-0 w-full h-full object-cover scale-[1.04] opacity-90 ${remixGeneratedImage ? '' : 'grayscale-[0.28]'}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-white/5" />
                  <div className="absolute inset-x-8 bottom-8 md:inset-x-10 md:bottom-10 z-10 space-y-5">
                    <span className="inline-flex items-center gap-2 border border-white/42 px-3 py-1.5 text-[10px] font-mono tracking-[0.18em] uppercase text-white">
                      <Sparkles className="w-3 h-3" />
                      {remixGeneratedImage
                        ? (language === 'zh' ? '生成结果' : 'Generated Result')
                        : (language === 'zh' ? '风格参考' : 'Style Reference')}
                    </span>
                    <div className="space-y-4 max-w-[520px]">
                      <h2 className="text-[42px] md:text-[52px] xl:text-[58px] font-black tracking-[-0.045em] leading-[0.9] text-white">
                        {language === 'zh' ? '商品宣传图（定制）' : 'Single Image Multi-Style Transformer'}
                      </h2>
                      <p className="text-[14px] md:text-[15px] text-white/86 leading-relaxed max-w-[460px] font-medium">
                        {language === 'zh'
                          ? '上传一张商品图，填写可选信息，选择 AI 风格模板，生成更精确的定制宣传视觉。'
                          : 'Upload a single product image, add optional metadata, and choose an AI style workflow.'}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Swiss configuration panel */}
                <section className="rx-enter bg-white min-h-[600px] xl:min-h-[720px] flex flex-col">
                  <div className="flex items-start gap-5 pb-5 border-b border-stone-200">
                    <span className="text-[44px] md:text-[50px] font-black tracking-[-0.08em] leading-none text-stone-300">01</span>
                    <div className="pt-1">
                      <h3 className="text-[28px] md:text-[32px] font-black tracking-[-0.04em] leading-none text-[#080808]">
                        {language === 'zh' ? '上传与选择' : 'Upload & Select'}
                      </h3>
                      <p className="mt-3 text-[13px] leading-relaxed text-stone-500 max-w-[330px]">
                        {language === 'zh'
                          ? '选择一个 AI 工作流模板，将特定视觉风格应用到你的商品图中。'
                          : 'Select an AI workflow template to apply a specific visual style to your product in the studio.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 space-y-5">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <span className="text-[12px] font-mono tracking-[0.18em] uppercase text-[#080808]">
                          {language === 'zh' ? '上传主体' : 'Upload Subject'}
                        </span>
                        <span className="text-[11px] font-mono tracking-[0.18em] uppercase text-stone-500">
                          {language === 'zh' ? '单图输入' : 'Single Input'}
                        </span>
                      </div>
                      {renderSwissCampaignUploadSlot()}
                    </div>

                    <div className="space-y-4">
                      <div className="border-b border-stone-200 pb-2">
                        <span className="text-[12px] font-mono tracking-[0.18em] uppercase text-[#080808]">
                          {language === 'zh' ? '可编辑信息' : 'Metadata Details'}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {campaignFields.map((field) => (
                          <label key={field.id} className="block space-y-2">
                            <span className="block text-[11px] font-mono tracking-[0.14em] uppercase text-stone-600">
                              {field.label}
                              <span className="ml-2 text-stone-300">{language === 'zh' ? '可选' : 'Optional'}</span>
                            </span>
                            <input
                              value={field.value}
                              onChange={(e) => updateCustomCampaignMeta(field.id, e.target.value)}
                              placeholder={field.placeholder}
                              className="w-full h-9 border border-stone-200 bg-white px-3 text-[13px] text-[#080808] placeholder:text-stone-300 focus:outline-none focus:border-[#080808] transition-colors"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between border-b border-stone-200 pb-2">
                        <span className="text-[12px] font-mono tracking-[0.18em] uppercase text-[#080808]">AI Style Deck</span>
                        <Palette className="w-4 h-4 text-stone-500" />
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {WORKFLOW_STYLE_OPTIONS.map((style) => {
                          const active = selectedRemixStyleId === style.id;
                          return (
                            <button
                              key={style.id}
                              type="button"
                              aria-pressed={active}
                              onMouseEnter={(e) => animateStyleTileHover(e.currentTarget, true)}
                              onMouseLeave={(e) => animateStyleTileHover(e.currentTarget, false)}
                              onFocus={(e) => animateStyleTileHover(e.currentTarget, true)}
                              onBlur={(e) => animateStyleTileHover(e.currentTarget, false)}
                              onClick={() => setSelectedRemixStyleId(style.id)}
                              className={`rx-style-tile swiss-style-tile group relative aspect-square overflow-hidden bg-stone-100 cursor-pointer focus:outline-none ${active ? 'is-active' : ''}`}
                            >
                              <img
                                src={style.thumbnail}
                                alt={language === 'zh' ? style.name_zh : style.name}
                                className="rx-style-img absolute inset-0 w-full h-full object-cover grayscale-[0.2]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/52 via-transparent to-white/8" />
                              <div className="rx-style-shine pointer-events-none absolute -inset-y-10 -left-1/2 w-1/2 rotate-12 bg-white/60 blur-md opacity-0" />
                              <div className="absolute inset-x-0 bottom-0 p-2.5">
                                <span className="rx-style-label block text-[8px] font-mono tracking-[0.12em] uppercase leading-tight text-white drop-shadow-sm">
                                  {language === 'zh' ? style.name_zh : style.name}
                                </span>
                              </div>
                              {active && (
                                <div className="rx-style-selected absolute right-2 top-2 w-6 h-6 bg-white text-[#080808] flex items-center justify-center">
                                  <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                </div>
                              )}
                            </button>
                          );
                        })}
                      </div>

                      <div className="rx-style-copy flex items-start gap-3 border-l-2 border-[#080808] pl-4">
                        <div className="min-w-0">
                          <p className="text-[13px] font-mono tracking-[0.12em] uppercase text-[#080808]">
                            {language === 'zh' ? selectedRemixStyle.name_zh : selectedRemixStyle.name}
                          </p>
                          <p className="mt-1 text-[11px] leading-relaxed text-stone-500">
                            {language === 'zh' ? selectedRemixStyle.description_zh : selectedRemixStyle.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <input ref={remixInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { acceptRemixFile(remixPickSlotRef.current, e.target.files?.[0]); e.target.value = ''; }} />
                  <input ref={remixCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { acceptRemixFile(remixPickSlotRef.current, e.target.files?.[0]); e.target.value = ''; }} />

                  <div className="mt-8">
                    {remixGeneratedImage || remixIsGenerating ? (
                      renderGeneratedActions('dark')
                    ) : (
                      <button
                        disabled={!ready}
                        onClick={generateFromRemix}
                        className={`w-full flex items-center justify-center gap-2.5 py-4 border text-[12px] font-mono tracking-[0.16em] uppercase transition-all ${
                          ready
                            ? 'border-[#080808] bg-[#080808] text-white hover:bg-white hover:text-[#080808] cursor-pointer'
                            : 'border-stone-200 bg-stone-100 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        {language === 'zh' ? `直接生成 · ${selectedRemixStyle.name_zh}` : `Generate · ${selectedRemixStyle.name}`}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </section>
              </div>
                );
              })() : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 mt-7 items-stretch">
                {/* LEFT — chosen workflow as the style reference */}
                <div className="rx-enter relative rounded-2xl overflow-hidden min-h-[480px] bg-[#0c0c0e] select-none">
                  <img
                    src={remixGeneratedImage || activeTemplate.originalImage}
                    alt=""
                    className="rx-hero-img absolute inset-0 w-full h-full object-cover scale-[1.08] opacity-[0.8]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c0e] via-[#0c0c0e]/55 to-[#0c0c0e]/10" />
                  <div className="relative z-10 h-full flex flex-col justify-end gap-4 p-8 md:p-10">
                    <span className="inline-flex items-center gap-1.5 self-start pl-2.5 pr-3 py-1 rounded-full bg-white/12 border border-white/20 text-white/85 text-[9.5px] font-bold tracking-[0.2em] uppercase backdrop-blur-md">
                      <Sparkles className="w-3 h-3" />
                      {remixGeneratedImage
                        ? (language === 'zh' ? '生成结果' : 'Generated Result')
                        : (language === 'zh' ? '风格参考' : 'Style Reference')}
                    </span>
                    <div className="space-y-2">
                      <span className="block text-[10px] font-bold tracking-[0.18em] uppercase text-[#9ed8de]">
                        {catLabel(activeTemplate.category)}
                      </span>
                      <h2 className="text-2xl md:text-[30px] font-bold tracking-tight text-white leading-[1.1]">
                        {language === 'zh' ? (activeTemplate.chineseName || activeTemplate.name) : activeTemplate.name}
                      </h2>
                      <p className="text-[12.5px] text-white/55 leading-relaxed max-w-md font-light line-clamp-3">
                        {language === 'zh' ? (activeTemplate.description_zh || activeTemplate.description) : (activeTemplate.description_en || activeTemplate.description)}
                      </p>
                    </div>
                    {(language === 'zh' ? activeTemplate.promptSuggestions_zh : activeTemplate.promptSuggestions_en) || activeTemplate.promptSuggestions ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {((language === 'zh' ? activeTemplate.promptSuggestions_zh : activeTemplate.promptSuggestions_en) || activeTemplate.promptSuggestions).slice(0, 3).map((sug, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-white/8 border border-white/10 text-white/70 text-[10.5px] font-medium backdrop-blur-sm">
                            {sug}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                {/* RIGHT — upload step */}
                {(() => {
                  const dual = remixIsDual(activeTemplate);
                  const stylePicker = remixHasStylePicker(activeTemplate);
                  const ready = dual ? Boolean(remixUploads[0] && remixUploads[1]) : Boolean(remixUploads[0]);
                  return (
                <div className="flex flex-col gap-5">
                  <div className="rx-enter flex items-center gap-3 pt-1">
                    <span className="w-8 h-8 rounded-lg bg-[#121212] text-white text-sm font-bold flex items-center justify-center shrink-0">1</span>
                    <div>
                      <h3 className="text-2xl font-bold tracking-tight text-[#121212] leading-tight">
                        {stylePicker
                          ? (language === 'zh' ? '上传一张图片，选择风格变化' : 'Upload one image, choose a style')
                          : dual
                            ? (language === 'zh' ? '上传两张图片' : 'Upload two images')
                            : (language === 'zh' ? '上传你的商品图片' : 'Upload your product')}
                      </h3>
                      {stylePicker ? (
                        <p className="text-[12px] text-stone-400 font-light mt-0.5">
                          {language === 'zh' ? '旁边选择一个 AI 工作流模板，最后会直接生成该风格图片。' : 'Pick one AI workflow style beside the upload, then generate that visual directly.'}
                        </p>
                      ) : dual && (
                        <p className="text-[12px] text-stone-400 font-light mt-0.5">
                          {language === 'zh' ? '依次上传需要合成的两张素材图' : 'Add the two source images to combine'}
                        </p>
                      )}
                    </div>
                  </div>

                  {stylePicker ? (
                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_300px] gap-5 flex-1 items-start">
                      <div className="flex flex-col gap-2.5">
                        <div className="rx-enter flex items-center justify-between gap-2">
                          <span className="text-[12.5px] font-bold text-[#121212] tracking-tight">
                            {language === 'zh' ? '上传主体图片' : 'Upload subject image'}
                          </span>
                          <span className="text-[10px] font-mono text-stone-400">
                            {language === 'zh' ? '单图输入' : '1 image'}
                          </span>
                        </div>
                        {renderRemixSlot(0, true)}
                      </div>

                      <div className="rx-enter flex flex-col gap-3.5 min-h-[290px]">
                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-[9px] font-mono font-bold tracking-[0.24em] uppercase text-[#0e7a86]">
                              AI Style Deck
                            </span>
                            <p className="mt-1 text-[12.5px] font-bold text-[#121212] tracking-tight">
                              {language === 'zh' ? '选择一种视觉方向' : 'Choose a visual direction'}
                            </p>
                          </div>
                          <div className="w-9 h-9 rounded-full bg-stone-950 text-white flex items-center justify-center shadow-[0_12px_28px_rgba(15,23,42,0.22)]">
                            <Palette className="w-4 h-4" />
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {WORKFLOW_STYLE_OPTIONS.map((style) => {
                            const active = selectedRemixStyleId === style.id;
                            return (
                              <button
                                key={style.id}
                                type="button"
                                aria-pressed={active}
                                onMouseEnter={(e) => animateStyleTileHover(e.currentTarget, true)}
                                onMouseLeave={(e) => animateStyleTileHover(e.currentTarget, false)}
                                onFocus={(e) => animateStyleTileHover(e.currentTarget, true)}
                                onBlur={(e) => animateStyleTileHover(e.currentTarget, false)}
                                onClick={() => setSelectedRemixStyleId(style.id)}
                                className={`rx-style-tile group relative aspect-square overflow-hidden rounded-[22px] bg-stone-950 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#0e7a86]/45 ${active ? 'is-active' : ''}`}
                              >
                                <img
                                  src={style.thumbnail}
                                  alt={language === 'zh' ? style.name_zh : style.name}
                                  className="rx-style-img absolute inset-0 w-full h-full object-cover"
                                />
                                <div
                                  className="absolute inset-0 mix-blend-soft-light"
                                  style={{ background: `linear-gradient(135deg, ${style.accent}88, rgba(0,0,0,0.12) 48%, rgba(255,255,255,0.16))` }}
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/12 to-white/5" />
                                <div className="rx-style-shine pointer-events-none absolute -inset-y-10 -left-1/2 w-1/2 rotate-12 bg-white/55 blur-md opacity-0" />
                                <div className="absolute left-3 top-3 w-2.5 h-2.5 rounded-full ring-4 ring-white/20" style={{ backgroundColor: style.accent }} />

                                <div className="absolute inset-x-0 bottom-0 p-3">
                                  <span className="rx-style-label block text-[10.5px] font-bold leading-tight text-white drop-shadow-sm">
                                    {language === 'zh' ? style.name_zh : style.name}
                                  </span>
                                </div>

                                {active && (
                                  <div className="rx-style-selected absolute right-2.5 top-2.5 w-6 h-6 rounded-full bg-white text-[#121212] flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.25)]">
                                    <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>

                        <div className="rx-style-copy pt-1">
                          <div className="h-px w-full bg-gradient-to-r from-transparent via-stone-200 to-transparent mb-3" />
                          <div className="flex items-start gap-3">
                            <span className="mt-1 w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: selectedRemixStyle.accent }} />
                            <div className="min-w-0">
                              <p className="text-[12px] font-bold text-[#121212] tracking-tight">
                                {language === 'zh' ? selectedRemixStyle.name_zh : selectedRemixStyle.name}
                              </p>
                              <p className="mt-1 text-[10.5px] leading-relaxed text-stone-400 font-light">
                                {language === 'zh' ? selectedRemixStyle.description_zh : selectedRemixStyle.description}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : dual ? (
                    <div className="grid grid-cols-2 gap-4 flex-1">
                      <div className="flex flex-col gap-2.5">
                        <div className="rx-enter flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-stone-900/90 text-white text-[10px] font-bold flex items-center justify-center">1</span>
                          <span className="text-[12.5px] font-bold text-[#121212] tracking-tight">
                            {language === 'zh' ? '图片一' : 'Image 1'}
                          </span>
                        </div>
                        {renderRemixSlot(0, true)}
                      </div>
                      <div className="flex flex-col gap-2.5">
                        <div className="rx-enter flex items-center gap-2">
                          <span className="w-5 h-5 rounded-md bg-stone-900/90 text-white text-[10px] font-bold flex items-center justify-center">2</span>
                          <span className="text-[12.5px] font-bold text-[#121212] tracking-tight">
                            {language === 'zh' ? '图片二' : 'Image 2'}
                          </span>
                        </div>
                        {renderRemixSlot(1, true)}
                      </div>
                    </div>
                  ) : (
                    renderRemixSlot(0, false)
                  )}

                  <input ref={remixInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { acceptRemixFile(remixPickSlotRef.current, e.target.files?.[0]); e.target.value = ''; }} />
                  <input ref={remixCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { acceptRemixFile(remixPickSlotRef.current, e.target.files?.[0]); e.target.value = ''; }} />

                  {remixGeneratedImage || remixIsGenerating ? (
                    renderGeneratedActions('dark')
                  ) : (
                    <button
                      disabled={!ready}
                      onClick={generateFromRemix}
                      className={`rx-enter w-full flex items-center justify-center gap-2.5 py-4 rounded-xl text-sm font-bold tracking-tight transition-all ${
                        ready
                          ? 'bg-[#0e7a86] text-white hover:brightness-110 shadow-[0_8px_24px_rgba(14,122,134,0.25)] cursor-pointer'
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {stylePicker
                        ? (language === 'zh' ? `直接生成 · ${selectedRemixStyle.name_zh}` : `Generate · ${selectedRemixStyle.name}`)
                        : (language === 'zh' ? '直接生成图片' : 'Generate Image')}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  )}
                </div>
                  );
                })()}
              </div>
              )}
            </div>
          </div>
        )}


        {/* VIEW 4: PERSONAL CURATOR CENTER */}
        {activeTab === 'profile' && (
          <div className="w-full h-full overflow-y-auto bg-stone-50/20 px-4 md:px-12 py-6 md:py-10 font-sans">
            <div className="max-w-4xl mx-auto space-y-10">
              
              {/* Profile Card Header */}
              <div className="bg-white rounded-2xl border border-stone-200/80 shadow-sm overflow-hidden flex flex-col md:flex-row items-center md:items-stretch gap-6">
                {/* Left cover block */}
                <div className="w-full md:w-[260px] bg-gradient-to-br from-stone-950 via-stone-900 to-[#271e16] p-6 text-white flex flex-col justify-between items-center text-center relative shrink-0">
                  <div className="absolute inset-0 bg-[radial-gradient(#0e7a86_1px,transparent_1px)] [background-size:20px_20px] opacity-10" />
                  
                  <div className="relative z-10 space-y-3 flex flex-col items-center">
                    <img 
                      src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80" 
                      alt="Avatar" 
                      className="w-20 h-20 rounded-full border-2 border-[#0e7a86] object-cover shadow-md"
                    />
                    <div>
                      <h2 className="text-base font-bold text-white tracking-wide">{userLoggedIn ? username : (language === 'zh' ? '访客设计师' : 'Guest Designer')}</h2>
                      <span className="text-[9px] font-bold text-[#0e7a86] tracking-widest font-mono uppercase bg-[#0e7a86]/10 px-2 py-0.5 rounded border border-[#0e7a86]/25 mt-1 inline-block">
                        {userLoggedIn ? (language === 'zh' ? '高级主创会员' : 'Lead Curator Pro') : (language === 'zh' ? '普通访客' : 'Guest Member')}
                      </span>
                    </div>
                  </div>

                  <p className="text-[10px] text-stone-400 font-light mt-6 max-w-[200px] leading-relaxed relative z-10">
                    "{language === 'zh' ? '极简、克制、富有张力的高定创物美学。' : 'Minimalist, restrained, and tense product photography aesthetics.'}"
                  </p>
                </div>

                {/* Right stats and overview block */}
                <div className="flex-1 p-6 flex flex-col justify-between gap-6">
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-[#0b616b] tracking-widest uppercase font-mono">
                      {language === 'zh' ? '创制中心概览' : 'Workspace Metrics'}
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="border border-stone-100 bg-stone-50/50 p-4 rounded-xl text-center space-y-1">
                        <span className="text-xl font-serif font-bold text-stone-850">142</span>
                        <p className="text-[9px] font-bold text-stone-400 tracking-wider uppercase font-mono">
                          {language === 'zh' ? '渲染打磨' : 'AI Renders'}
                        </p>
                      </div>
                      <div className="border border-stone-100 bg-stone-50/50 p-4 rounded-xl text-center space-y-1">
                        <span className="text-xl font-serif font-bold text-stone-850">{favoriteTemplateIds.length}</span>
                        <p className="text-[9px] font-bold text-stone-400 tracking-wider uppercase font-mono">
                          {language === 'zh' ? '收藏模组' : 'Starred Specs'}
                        </p>
                      </div>
                      <div className="border border-stone-100 bg-stone-50/50 p-4 rounded-xl text-center space-y-1">
                        <span className="text-xl font-serif font-bold text-stone-850">{versionHistory.length}</span>
                        <p className="text-[9px] font-bold text-stone-400 tracking-wider uppercase font-mono">
                          {language === 'zh' ? '历史版本' : 'Saved Steps'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-stone-100 pt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-xs font-sans">
                    <div className="space-y-1 text-stone-500 font-light">
                      <p>{language === 'zh' ? '系统激活状态：全功能无阻' : 'Atelier Access Tier: Enterprise Unrestricted'}</p>
                      <p className="text-[10px] text-stone-400 font-mono">Client ID: FOTO-UX-2026-ACTIVE</p>
                    </div>

                    {!userLoggedIn && (
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="py-2 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-semibold tracking-wider transition-all cursor-pointer"
                      >
                        {language === 'zh' ? '登录同步云端数据' : 'Sign In to Sync'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Detail Tabs in Personal Center */}
              <div className="space-y-6 font-sans">
                {/* Secondary tab switcher */}
                <div className="flex border-b border-stone-200 pb-2 text-xs font-semibold text-stone-500 gap-6 select-none">
                  {[
                    { id: 'favs', label_zh: '我的收藏', label_en: 'My Favorites' },
                    { id: 'settings', label_zh: '偏好设置', label_en: 'Atelier Settings' }
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setProfileSubTab(subTab.id as any)}
                      className={`pb-2 relative transition-colors cursor-pointer ${profileSubTab === subTab.id ? 'text-[#121212] font-bold' : 'hover:text-stone-800'}`}
                    >
                      {language === 'zh' ? subTab.label_zh : subTab.label_en}
                      {profileSubTab === subTab.id && (
                        <motion.div layoutId="profile-subtab-indicator" className="absolute bottom-0 inset-x-0 h-0.5 bg-[#0e7a86]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* SubTab Content panels */}
                <div className="min-h-[200px]">
                  
                  {/* Starred templates */}
                  {profileSubTab === 'favs' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {templates.filter(t => favoriteTemplateIds.includes(t.id)).map((tpl) => {
                        const idx = templates.findIndex(t => t.id === tpl.id);
                        return (
                          <div 
                            key={tpl.id}
                            className="bg-white border border-stone-200/80 rounded-xl p-3.5 flex items-center justify-between gap-4 hover:border-[#0e7a86]/50 transition-colors cursor-pointer group"
                            onClick={() => {
                              setActiveTemplateIndex(idx);
                              setActiveTab('sandbox');
                              triggerToast(language === 'zh' ? `已在工作台载入: ${tpl.chineseName}` : `Loaded preset: ${tpl.name}`);
                            }}
                          >
                            <div className="flex items-center gap-3 truncate">
                              <img src={tpl.originalImage} alt={tpl.name} className="w-12 h-12 rounded-lg object-cover border border-stone-150 flex-shrink-0" />
                              <div className="truncate">
                                <h4 className="text-xs font-bold text-stone-850 truncate group-hover:text-[#0e7a86] transition-colors font-sans">
                                  {language === 'zh' ? (tpl.chineseName || tpl.name) : tpl.name}
                                </h4>
                                <span className="text-[9px] font-bold text-stone-400 font-mono uppercase tracking-widest">{tpl.category}</span>
                              </div>
                            </div>
                            <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#0e7a86] transition-all group-hover:translate-x-0.5" />
                          </div>
                        );
                      })}
                      
                      {templates.filter(t => favoriteTemplateIds.includes(t.id)).length === 0 && (
                        <div className="col-span-2 text-center py-10 border border-dashed border-stone-200 rounded-xl bg-white text-stone-400 font-sans">
                          <Heart className="w-6 h-6 mx-auto text-stone-300 mb-2" />
                          <p className="text-xs">{language === 'zh' ? '暂无收藏模板' : 'No favorites saved yet.'}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Settings */}
                  {profileSubTab === 'settings' && (
                    <div className="bg-white border border-stone-200/80 rounded-xl p-6 space-y-6 text-xs font-sans">
                      <div className="space-y-4">
                        <h4 className="font-bold text-stone-800 border-b border-stone-100 pb-2">
                          {language === 'zh' ? '常规偏好' : 'General Configuration'}
                        </h4>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <p className="font-bold text-stone-700">{language === 'zh' ? '工作坊默认语言' : 'Default Workspace Language'}</p>
                            <p className="text-[10px] text-stone-400 font-light mt-0.5">{language === 'zh' ? '切换语言，包括页面提示语翻译。' : 'Toggles translations for titles and UI descriptors.'}</p>
                          </div>
                          
                          <div className="flex bg-stone-100 p-0.5 rounded-full border border-stone-200 text-[10px] font-bold">
                            <button 
                              onClick={() => {
                                setLanguage('zh');
                                triggerToast('中文界面已激活。');
                              }}
                              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${language === 'zh' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                            >
                              中文简体
                            </button>
                            <button 
                              onClick={() => {
                                setLanguage('en');
                                triggerToast('English active.');
                              }}
                              className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${language === 'en' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
                            >
                              English
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-stone-100">
                        <h4 className="font-bold text-stone-800 border-b border-stone-100 pb-2">
                          {language === 'zh' ? '高级清除' : 'Advanced Operations'}
                        </h4>
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div>
                            <p className="font-bold text-stone-700">{language === 'zh' ? '清除项目本地存档' : 'Clear Project Local Storage'}</p>
                            <p className="text-[10px] text-stone-400 font-light mt-0.5">{language === 'zh' ? '清除本地保存的偏好设置与用户自定义模板缓存。' : 'Resets local browser workspace templates cache.'}</p>
                          </div>
                          
                          <button 
                            onClick={() => {
                              localStorage.removeItem('foto_user_templates_v2');
                              triggerToast(language === 'zh' ? '本地缓存模板已清除，请刷新页面。' : 'Browser storage templates cache dropped.', 'info');
                            }}
                            className="py-1.5 px-3 border border-red-200 hover:bg-red-50 text-red-600 rounded-lg font-bold text-[10.5px] transition-colors cursor-pointer"
                          >
                            {language === 'zh' ? '重置工作区' : 'Reset Workspace'}
                          </button>
                        </div>

                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-4 border-t border-stone-100">
                          <div>
                            <p className="font-bold text-stone-700">{language === 'zh' ? '安全退出登录' : 'Sign Out Account'}</p>
                            <p className="text-[10px] text-stone-400 font-light mt-0.5">{language === 'zh' ? '退出当前登录的设计师账户状态。' : 'Signs out from the active curator session.'}</p>
                          </div>
                          
                          <button 
                            onClick={() => {
                              setUserLoggedIn(false);
                              setActiveTab('quickstart');
                              triggerToast(language === 'zh' ? '您已安全退出登录。' : 'Signed out from your account.', 'info');
                            }}
                            className="py-1.5 px-3 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded-lg font-bold text-[10.5px] transition-colors cursor-pointer"
                          >
                            {language === 'zh' ? '退出登录' : 'Sign Out'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              </div>

            </div>
          </div>
        )}

      </main>

        {/* --- MOBILE BOTTOM TAB BAR — Swiss / International Typographic style (Studio Workbench excluded) --- */}
        <nav
          className="lg:hidden shrink-0 bg-white border-t-2 border-[#0a0a0a] z-40"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)', fontFamily: '"Inter", "Helvetica Neue", Helvetica, Arial, "PingFang SC", "Microsoft YaHei", sans-serif' }}
        >
          <div className="grid grid-cols-3 divide-x divide-stone-200/70">
            {[
              { id: 'quickstart', label_zh: '快速开始', label_en: 'Home', icon: Home },
              { id: 'templates', label_zh: '素材广场', label_en: 'Plaza', icon: ImageIcon },
              { id: 'profile', label_zh: '我的', label_en: 'Profile', icon: User },
            ].map((item) => {
              const active = activeTab === item.id || (activeTab === 'remix' && item.id === remixOrigin);
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className="relative flex flex-col items-center justify-center gap-1.5 py-3 active:bg-stone-50 transition-colors"
                >
                  {/* Swiss active indicator — a solid block rule at the top of the cell */}
                  <span className={`absolute top-0 inset-x-0 h-[3px] transition-colors ${active ? 'bg-[#0e7a86]' : 'bg-transparent'}`} />
                  <Icon className={`w-5 h-5 ${active ? 'text-[#0e7a86]' : 'text-[#0a0a0a]'}`} strokeWidth={active ? 2.5 : 2} />
                  <span className={`text-[10px] font-extrabold uppercase tracking-[0.12em] ${active ? 'text-[#0a0a0a]' : 'text-stone-400'}`}>
                    {language === 'zh' ? item.label_zh : item.label_en}
                  </span>
                </button>
              );
            })}
          </div>
        </nav>

      {/* --- BESPOKE ATELIER TEMPLATE ARCHIVE CONFIGURATION MODAL --- */}
      <AnimatePresence>
        {templateConfigModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121212]/50 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-6"
            onClick={() => setTemplateConfigModalOpen(false)} // 点击空白处自动关闭
            id="template-upload-config-modal-overlay"
          >
            <motion.div 
              initial={{ scale: 0.97, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 15 }}
              className="bg-white border border-stone-200 w-full max-w-3xl rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col md:flex-row"
              onClick={(e) => e.stopPropagation()} // 阻止向外冒泡
              id="template-upload-config-modal-body"
            >
              {/* Left Side: Specimen Real-time Preview */}
              <div id="template-upload-config-preview-pane" className="w-full md:w-1/2 bg-stone-50 border-r border-stone-100 flex flex-col justify-center items-center p-6 min-h-[280px] md:min-h-[420px] relative group">
                <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-[#121212]/75 backdrop-blur-md text-[#fafafa] px-2.5 py-1 rounded-full border border-white/10 text-[9px] font-mono tracking-widest uppercase font-bold shadow-md">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3aa0ab] animate-pulse" />
                  <span>Preview Specimen</span>
                </div>
                {templateConfigImage ? (
                  <div className="w-full aspect-[4/5] rounded-2xl overflow-hidden shadow-lg border border-stone-200 bg-white relative">
                    <img 
                      src={templateConfigImage} 
                      alt="configuring-preset" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  </div>
                ) : (
                  <div className="w-full aspect-[4/5] rounded-2xl border-2 border-dashed border-stone-200 flex flex-col items-center justify-center text-stone-400">
                    <Upload className="w-8 h-8 text-stone-350 mb-2 animate-bounce" />
                    <span className="text-[10px] uppercase font-mono tracking-wider font-semibold">No active file</span>
                  </div>
                )}
              </div>

              {/* Right Side: Creative Configuration Form */}
              <div id="template-upload-config-inputs-pane" className="w-full md:w-1/2 p-7 flex flex-col justify-between space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold tracking-widest text-[#0b616b] uppercase font-mono flex items-center gap-1">
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      <span>Atelier Custom Curator</span>
                    </span>
                    <h3 className="text-sm font-extrabold text-[#121212] font-sans">
                      {language === 'zh' ? '研创底片所属类目与细化归档' : 'Configure Custom Template Metadata'}
                    </h3>
                    <p className="text-[10px] text-stone-500 font-medium leading-relaxed font-sans">
                      {language === 'zh' 
                        ? '请为此专属样板底片打上分类与细分小分类。它将自动归入个人橱窗库并支持侧边栏检索。' 
                        : 'Classify this newly imported background. It will integrate into your custom studio categories instantly.'}
                    </p>
                  </div>

                  <div className="space-y-3.5 pt-2">
                    {/* Template name configuration */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-sans block">
                        {language === 'zh' ? '样板研发名称' : 'Bespoke Preset Name'}
                      </label>
                      <input 
                        type="text"
                        value={templateConfigName}
                        onChange={(e) => setTemplateConfigName(e.target.value)}
                        placeholder={language === 'zh' ? '例如：极简落日暖蜡烛光影' : 'e.g., Warm Sunset Candlestick'}
                        className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-200 outline-none focus:border-[#0e7a86] focus:ring-1 focus:ring-[#0e7a86]/30 bg-[#fafafa]/50 transition-all font-semibold text-[#121212]"
                      />
                    </div>

                    {/* Category setting */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-sans block">
                        {language === 'zh' ? '归档主级类目' : 'Select Core Category'}
                      </label>
                      <select
                        value={templateConfigCategory}
                        onChange={(e) => {
                          const catId = e.target.value;
                          setTemplateConfigCategory(catId);
                          // Auto set subcategory to first available subcategory
                          const matchedCat = CATEGORY_MAP.find(c => c.id === catId);
                          if (matchedCat && matchedCat.subcategories.length > 0) {
                            setTemplateConfigSubcategory(matchedCat.subcategories[0].id);
                          } else {
                            setTemplateConfigSubcategory('all');
                          }
                        }}
                        className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-200 outline-none focus:border-[#0e7a86] bg-white transition-all text-[#121212] font-semibold"
                      >
                        {CATEGORY_MAP.map(c => (
                          <option key={c.id} value={c.id}>
                            {language === 'zh' ? c.name_zh : c.name_en}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Subcategory setting */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-stone-500 uppercase tracking-wider font-sans block">
                        {language === 'zh' ? '归纳专属细分子类' : 'Select Target Subcategory'}
                      </label>
                      <select
                        value={templateConfigSubcategory}
                        onChange={(e) => setTemplateConfigSubcategory(e.target.value)}
                        className="w-full text-xs py-2.5 px-3 rounded-xl border border-stone-200 outline-none focus:border-[#0e7a86] bg-white transition-all text-[#121212] font-semibold"
                      >
                        {(() => {
                          const currentCatObj = CATEGORY_MAP.find(c => c.id === templateConfigCategory);
                          const options = currentCatObj?.subcategories || [];
                          return (
                            <>
                              <option value="all">
                                {language === 'zh' ? '全域子类别' : 'All Sub-categories'}
                              </option>
                              {options.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                  {language === 'zh' ? sub.name_zh : sub.name_en}
                                </option>
                              ))}
                            </>
                          );
                        })()}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-4 border-t border-stone-100">
                  <button 
                    type="button" 
                    id="template-config-discard-btn"
                    onClick={() => setTemplateConfigModalOpen(false)}
                    className="flex-1 py-2.5 px-4 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl tracking-wide font-bold text-xs transition-colors cursor-pointer"
                  >
                    {language === 'zh' ? '废弃取消' : 'Discard'}
                  </button>
                  <button 
                    type="button" 
                    id="template-config-save-btn"
                    onClick={saveConfiguredTemplate}
                    className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#08363b] to-[#0b616b] hover:brightness-110 text-white rounded-xl font-extrabold text-xs transition-all shadow-[0_4px_16px_rgba(29,78,216,0.2)] cursor-pointer"
                  >
                    {language === 'zh' ? '保存专属归档' : 'Archive & Apply'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- PREMIUM BATCH 4-STYLE GENERATION DRAWER/MODAL --- */}
      <AnimatePresence>
        {showBatchModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#121212]/50 backdrop-blur-md z-50 flex items-center justify-center p-6"
            onClick={() => setShowBatchModal(false)} // 点击空白处自动关闭
          >
            <motion.div 
              initial={{ scale: 0.97, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.97, y: 15 }}
              className="bg-white border border-stone-200 w-full max-w-5xl rounded-3xl shadow-[0_32px_80px_rgba(0,0,0,0.18)] overflow-hidden flex flex-col max-h-[90vh]"
              onClick={(e) => e.stopPropagation()} // 阻止向外冒泡
            >
              {/* Modal Head */}
              <div className="p-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold tracking-widest text-[#0b616b] uppercase font-mono flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#0e7a86]" />
                    <span>Parallel Style Engine</span>
                  </span>
                  <h3 className="text-base font-bold text-[#121212] font-sans">
                    {language === 'zh' ? '高定4联电商风格方案对比' : '4-Style Creative Refinement Matrix'}
                  </h3>
                </div>
                <button 
                  onClick={() => setShowBatchModal(false)} 
                  className="w-8 h-8 rounded-full border border-stone-200 bg-white hover:bg-stone-50 flex items-center justify-center text-stone-400 hover:text-stone-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Dynamic state container */}
              <div className="flex-1 overflow-y-auto p-8 select-none">
                {isBatchGenerating ? (
                  /* EXQUISITE RUNTIME SCANNING LOADER */
                  <div className="py-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 rounded-full border-2 border-stone-100 border-t-[#0e7a86] animate-spin" />
                      <div className="absolute inset-2 rounded-full border border-[#0b616b]/20 border-b-[#0b616b] animate-spin-reverse" />
                      <div className="absolute inset-5 bg-[#fafafa] rounded-full flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-[#0e7a86] animate-pulse" />
                      </div>
                    </div>
                    <div className="space-y-2 max-w-md mx-auto">
                      <h4 className="text-xs font-mono tracking-widest text-[#121212] uppercase font-bold animate-pulse">
                        {language === 'zh' ? '多引擎并行计算中...' : 'Synergizing Multi-Artistic Pipelines...'}
                      </h4>
                      <p className="text-[10px] text-stone-400 font-medium leading-relaxed">
                        {language === 'zh' 
                          ? '正在智能映射：①米黄洞石古典画室、②流体镀铬赛博金属、③暮色旷野温暖阳光、④极简罗马展厅' 
                          : 'Synthesizing: ①Travertine Ateliers, ②Chromo Kinetic Polymer, ③Muted Sahara Dusk, ④Alabastar Gallery'}
                      </p>
                    </div>
                  </div>
                ) : (
                  /* 2X2 HIGHEST-FIDELITY GRID DISPLAY */
                  <div className="space-y-6">
                    <div className="text-center max-w-lg mx-auto">
                      <p className="text-xs text-stone-500 leading-relaxed">
                        {language === 'zh' 
                          ? '智能画境算法为您的本品定制了以下 4 张高质感视觉渲染底案，双击或点击下方选项可一键收纳作为主要画布。' 
                          : 'Our creative pipeline generated 4 high-fidelity options tailored for your brand specs. Click on any specimen preview below to apply.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      {batchResults.map((item, idx) => (
                        <div 
                          key={item.id} 
                          className="group border border-stone-200/80 bg-stone-50/50 rounded-2xl overflow-hidden hover:shadow-[0_16px_36px_rgba(0,0,0,0.06)] hover:border-[#0e7a86]/65 transition-all flex flex-col justify-between"
                        >
                          <div className="relative aspect-[4/5] overflow-hidden bg-white">
                            <img 
                              src={item.image} 
                              alt={item.name} 
                              className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500" 
                            />
                            <span className="absolute top-3 left-3 px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase tracking-widest bg-black/75 text-white">
                              STYLE {idx + 1}
                            </span>
                          </div>

                          <div className="p-4 space-y-3.5 bg-white border-t border-stone-100 flex-1 flex flex-col justify-between">
                            <div className="space-y-1">
                              <h5 className="text-[11px] font-bold text-[#121212] leading-tight">
                                {language === 'zh' ? item.name_zh : item.name}
                              </h5>
                              <p className="text-[9px] font-mono text-stone-400">
                                {language === 'zh' ? item.style_zh : item.style}
                              </p>
                            </div>

                            <button
                              onClick={() => {
                                // Apply Selected Batch Result Specimen
                                setCurrentImage(item.image);
                                // Push snapshot to history version
                                const newVerItem: HistoryVersion = {
                                  id: `batch-${Date.now()}`,
                                  image: item.image,
                                  title: `批量方案 ${idx + 1}: ${item.style_zh}`,
                                  title_en: `Batch Result ${idx + 1}: ${item.style}`,
                                  promptApplied: item.name,
                                  timestamp: new Date().toLocaleTimeString(),
                                  annotations: []
                                };
                                setVersionHistory(prev => [newVerItem, ...prev]);
                                setShowBatchModal(false);
                                triggerToast(
                                  language === 'zh' 
                                    ? `✨ 已成功采纳风格：${item.style_zh}` 
                                    : `Applied style: ${item.style}`, 
                                  'success'
                                );
                              }}
                              className="w-full py-1.5 rounded-lg border border-[#121212] text-[#121212] hover:bg-[#121212] hover:text-[#fafafa] font-sans text-[10px] font-semibold tracking-wider uppercase transition-colors text-center"
                            >
                              {language === 'zh' ? '应用此精修底案' : 'Apply Specimen'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-stone-100 bg-stone-50 flex items-center justify-between text-[10px] text-stone-400 font-mono">
                <span>Enterprise Parallel GPU Node • Live</span>
                <span>Select 1 of 4</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- MINIMALIST LOGIN MODAL (Google one-click + mock email auth) --- */}
      <AnimatePresence>
        {showLoginModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-xl z-50 flex items-center justify-center p-4 font-sans"
            onClick={() => setShowLoginModal(false)}
          >
            <motion.div
              ref={loginCardRef}
              initial={{ scale: 0.94, y: 24, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.96, y: 16, opacity: 0 }}
              transition={{ type: 'spring', damping: 26, stiffness: 280 }}
              className="relative bg-white w-full max-w-[400px] rounded-[28px] shadow-[0_30px_90px_rgba(15,23,42,0.18)] border border-stone-100 px-9 py-10 select-none overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Soft ambient glow */}
              <div className="absolute -top-24 -right-20 w-56 h-56 rounded-full bg-[#0e7a86]/10 blur-3xl pointer-events-none" />

              {/* Close button */}
              <button
                onClick={() => setShowLoginModal(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Brand + heading */}
              <div className="relative flex flex-col items-center text-center mb-8">
                <div className="login-anim w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0e7a86] to-[#0b616b] flex items-center justify-center shadow-lg shadow-[#0e7a86]/25 mb-5">
                  <span className="text-white font-serif font-bold text-2xl">F</span>
                </div>
                <h3 className="login-anim text-xl font-bold text-stone-900 tracking-tight">
                  {language === 'zh' ? '欢迎回来' : 'Welcome back'}
                </h3>
                <p className="login-anim text-[13px] text-stone-400 mt-1.5 font-light">
                  {language === 'zh' ? '登录以继续您的高定创作' : 'Sign in to continue to FOTO Studio'}
                </p>
              </div>

              {/* Google one-click */}
              <button
                onClick={() => completeLogin(
                  language === 'zh' ? 'Google 设计师' : 'Google Curator',
                  language === 'zh' ? '🎉 已通过 Google 账号一键登录' : '🎉 Signed in with Google'
                )}
                className="login-anim group w-full h-12 rounded-2xl border border-stone-200 bg-white hover:bg-stone-50 hover:border-stone-300 flex items-center justify-center gap-3 text-sm font-semibold text-stone-700 transition-all cursor-pointer hover:shadow-sm active:scale-[0.99]"
              >
                <svg className="w-5 h-5 transition-transform group-hover:scale-110" viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                {language === 'zh' ? '使用 Google 账号继续' : 'Continue with Google'}
              </button>

              {/* Divider */}
              <div className="login-anim flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-stone-200" />
                <span className="text-[11px] text-stone-400 font-medium uppercase tracking-wider">
                  {language === 'zh' ? '或' : 'or'}
                </span>
                <div className="flex-1 h-px bg-stone-200" />
              </div>

              {/* Email / password form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!loginEmail.trim() || !loginPassword.trim()) {
                    triggerToast(language === 'zh' ? '请输入邮箱与密码' : 'Enter email and password', 'error');
                    return;
                  }
                  completeLogin(
                    loginEmail.split('@')[0] || (language === 'zh' ? '设计师' : 'Curator'),
                    language === 'zh' ? '🎉 登录成功，欢迎回来！' : '🎉 Signed in successfully!'
                  );
                }}
                className="space-y-3"
              >
                <div className="login-anim">
                  <input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder={language === 'zh' ? '邮箱地址' : 'Email address'}
                    className="w-full h-12 bg-stone-50/80 border border-stone-200 rounded-2xl px-4 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#0e7a86] focus:ring-2 focus:ring-[#0e7a86]/15 focus:bg-white transition-all"
                  />
                </div>

                <div className="login-anim relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder={language === 'zh' ? '密码' : 'Password'}
                    className="w-full h-12 bg-stone-50/80 border border-stone-200 rounded-2xl px-4 pr-11 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-[#0e7a86] focus:ring-2 focus:ring-[#0e7a86]/15 focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <div className="login-anim flex justify-end">
                  <span className="text-[12px] text-[#0e7a86] hover:underline cursor-pointer font-medium">
                    {language === 'zh' ? '忘记密码？' : 'Forgot password?'}
                  </span>
                </div>

                <button
                  type="submit"
                  className="login-anim w-full h-12 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white text-sm font-semibold transition-all shadow-md shadow-stone-900/10 cursor-pointer active:scale-[0.99]"
                >
                  {language === 'zh' ? '登录' : 'Sign in'}
                </button>
              </form>

              {/* Footer */}
              <p className="login-anim text-center text-[12px] text-stone-400 mt-6">
                {language === 'zh' ? '还没有账号？' : "Don't have an account?"}{' '}
                <span
                  onClick={() => {
                    setLoginEmail('designer@foto.com');
                    setLoginPassword('demo123');
                    triggerToast(language === 'zh' ? '已填充演示账号，点击登录即可' : 'Demo credentials filled', 'info');
                  }}
                  className="text-stone-900 font-semibold hover:underline cursor-pointer"
                >
                  {language === 'zh' ? '快速体验' : 'Try demo'}
                </span>
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  </div>
  );
}
