export interface QuestionnaireQuestion {
  id: string;
  category: string;
  question: string;
  placeholder?: string;
}

export interface QuestionnaireAnswer {
  questionId: string;
  category: string;
  answer: string;
}

export interface PresetTemplate {
  id: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  relationship_type: 'deceased' | 'family';
  questions: QuestionnaireQuestion[];
}

/**
 * 预设模板 - 针对不同关系类型的定制问卷
 * Preset templates - customized questionnaires for different relationship types
 */
export const PRESET_TEMPLATES: PresetTemplate[] = [
  // === 家人/在世亲属预设 ===
  {
    id: 'living-parent',
    name: { zh: '远方的父母', en: 'Living Parent' },
    description: {
      zh: '为远在他乡的父母创建数字分身，让你随时都能"和TA说话"',
      en: 'For parents who live far away, create a digital presence so you can always "talk" to them',
    },
    relationship_type: 'family',
    questions: [
      { id: 'lp1', category: 'habits', question: 'TA 每天的日常作息是怎样的？', placeholder: '例如：早上5点起床，去公园打太极，回来做饭' },
      { id: 'lp2', category: 'personality', question: 'TA 有什么常挂在嘴边的话或教育理念？', placeholder: '例如："做人要踏实"、"吃亏是福"' },
      { id: 'lp3', category: 'life_events', question: '你小时候TA经常给你讲什么故事或回忆？', placeholder: '例如：TA年轻时在村里的趣事，或者艰难岁月的故事' },
      { id: 'lp4', category: 'habits', question: 'TA 擅长做什么菜？有什么拿手好菜？', placeholder: '例如：红烧排骨、自家腌制的咸菜' },
      { id: 'lp5', category: 'values', question: 'TA 最近有什么担心或关注的事情？', placeholder: '例如：担心身体、关心孙辈学习、关注村里变化' },
    ],
  },
  {
    id: 'growing-child',
    name: { zh: '成长中的孩子', en: 'Growing Child' },
    description: {
      zh: '记录孩子不同成长阶段的个性，创建一个成长时光胶囊',
      en: 'Capture your child\'s personality at different life stages, create a time capsule of their growth',
    },
    relationship_type: 'family',
    questions: [
      { id: 'gc1', category: 'personality', question: 'TA 最突出的性格特点是什么？', placeholder: '例如：好奇心强、爱笑、有点倔强' },
      { id: 'gc2', category: 'habits', question: 'TA 最近最喜欢玩什么、做什么？', placeholder: '例如：乐高、画画、看恐龙绘本' },
      { id: 'gc3', category: 'life_events', question: 'TA 说过什么让你印象深刻的童言童语？', placeholder: '例如："妈妈，月亮为什么跟着我们走？"' },
      { id: 'gc4', category: 'values', question: 'TA 说长大后想做什么？有什么小梦想？', placeholder: '例如：想当宇航员、想开冰淇淋店' },
    ],
  },
  {
    id: 'long-distance-partner',
    name: { zh: '异地伴侣', en: 'Long-distance Partner' },
    description: {
      zh: '为异地恋的TA创建AI伴侣，了解你伴侣的个性和习惯',
      en: 'For couples in long-distance relationships, create an AI companion that understands your partner\'s personality',
    },
    relationship_type: 'family',
    questions: [
      { id: 'ldp1', category: 'relationships', question: 'TA 表达爱的方式是什么？', placeholder: '例如：每天问候、记住我说过的话、默默准备惊喜' },
      { id: 'ldp2', category: 'life_events', question: '你们之间最珍贵的共同回忆是什么？', placeholder: '例如：第一次见面的场景、一起旅行时的小插曲' },
      { id: 'ldp3', category: 'personality', question: 'TA 有什么只有你们知道的小习惯或内梗？', placeholder: '例如：某个搞笑的表情包、只有你们懂的玩笑' },
      { id: 'ldp4', category: 'values', question: 'TA 对未来有什么规划和期待？', placeholder: '例如：一起生活的计划、共同的旅行心愿单' },
      { id: 'ldp5', category: 'habits', question: 'TA 日常生活有什么特别的习惯？', placeholder: '例如：睡前一定要聊天、早上会发早安' },
    ],
  },
];

export const QUESTIONNAIRE_CATEGORIES = [
  'personality',
  'life_events',
  'relationships',
  'habits',
  'values',
] as const;

export const QUESTIONS: QuestionnaireQuestion[] = [
  // 性格特质
  { id: 'p1', category: 'personality', question: 'TA 最大的性格特点是什么？', placeholder: '例如：总是为别人着想，嘴硬心软' },
  { id: 'p2', category: 'personality', question: 'TA 有什么口头禅或常用的语气词？', placeholder: '例如："哎呀"、"好嘛"、"随便啦"' },

  // 人生经历
  { id: 'l1', category: 'life_events', question: 'TA 人生中最重要的一段经历是什么？', placeholder: '例如：年轻时独自去大城市打拼' },
  { id: 'l2', category: 'life_events', question: 'TA 最自豪的事情是什么？', placeholder: '例如：把三个孩子都培养成大学生' },

  // 人际关系
  { id: 'r1', category: 'relationships', question: 'TA 和你之间最珍贵的一段回忆是什么？', placeholder: '例如：小时候每天放学一起走路回家' },
  { id: 'r2', category: 'relationships', question: 'TA 和其他人相处时有什么特点？', placeholder: '例如：对陌生人有礼貌但保持距离' },

  // 日常习惯
  { id: 'h1', category: 'habits', question: 'TA 日常有什么特别的习惯或爱好？', placeholder: '例如：每天早上六点去公园遛弯' },
  { id: 'h2', category: 'habits', question: 'TA 最喜欢吃什么？', placeholder: '例如：红烧肉，一定要放冰糖' },

  // 价值观
  { id: 'v1', category: 'values', question: 'TA 最看重什么？', placeholder: '例如：家庭和睦、诚实做人' },
  { id: 'v2', category: 'values', question: '如果 TA 遇到困难，通常会怎么做？', placeholder: '例如：自己默默扛着，不告诉家里人' },
];

/**
 * 将问卷答案渲染为 CharacterCard 生成上下文
 */
export function renderQuestionnaireContext(answers: QuestionnaireAnswer[]): string {
  if (answers.length === 0) return '';

  const categories = {
    personality: '性格特质',
    life_events: '人生经历',
    relationships: '人际关系',
    habits: '日常习惯',
    values: '价值观',
  };

  const grouped = new Map<string, QuestionnaireAnswer[]>();
  for (const a of answers) {
    if (!grouped.has(a.category)) grouped.set(a.category, []);
    grouped.get(a.category)!.push(a);
  }

  let context = '\n\n## 问卷补充信息（来自用户的详细描述）\n';
  for (const [cat, items] of grouped) {
    context += `\n### ${categories[cat as keyof typeof categories] || cat}\n`;
    for (const item of items) {
      const q = QUESTIONS.find((q) => q.id === item.questionId);
      context += `- ${q?.question || item.questionId}: ${item.answer}\n`;
    }
  }
  return context;
}
