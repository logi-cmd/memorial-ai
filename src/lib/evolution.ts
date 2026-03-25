import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CharacterCard = Record<string, any>;

interface EvolutionPatch {
  field: string;
  subfield?: string;
  old_value: unknown;
  new_value: unknown;
  reason: string;
  significance: number; // 1-5
}

interface EvolutionResult {
  patches: EvolutionPatch[];
  significance: number; // 平均
  should_apply: boolean; // significance >= 3
}

/**
 * 分析对话是否触发人格演化，生成增量 patch
 */
export async function evolveCharacterCard(
  characterCard: CharacterCard,
  conversationSummary: string,
  recentMemories: string[]
): Promise<EvolutionResult> {
  const prompt = `你是一个人格演化分析器。基于以下信息，判断分身的 CharacterCard 是否需要更新。

当前 CharacterCard:
${JSON.stringify(characterCard, null, 2)}

最近对话摘要:
${conversationSummary}

新发现的记忆:
${recentMemories.map((m) => `- ${m}`).join('\n')}

分析规则：
1. 只在发现**新的、有意义的信息**时才建议修改
2. 每次最多修改 2 个字段
3. 修改应该是**增量**的（添加新特质，不是替换）
4. 评估每个修改的重要度（1-5），3以上才建议应用

返回 JSON 格式：
{
  "patches": [
    {
      "field": "字段名",
      "subfield": "子字段名（可选）",
      "old_value": "旧值",
      "new_value": "新值",
      "reason": "修改原因",
      "significance": 3
    }
  ],
  "significance": 3,
  "should_apply": true
}

如果没有需要修改的内容，返回空 patches 和 should_apply=false。`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1000,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return { patches: [], significance: 0, should_apply: false };
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return {
      patches: result.patches || [],
      significance: result.significance || 0,
      should_apply: result.should_apply || false,
    };
  } catch {
    return { patches: [], significance: 0, should_apply: false };
  }
}

/**
 * 将 patch 应用到 CharacterCard
 */
export function applyEvolutionPatch(card: CharacterCard, patches: EvolutionPatch[]): CharacterCard {
  const updated = JSON.parse(JSON.stringify(card)) as CharacterCard;

  for (const patch of patches) {
    if (patch.subfield) {
      if (!updated[patch.field]) {
        (updated as Record<string, unknown>)[patch.field] = {};
      }
      ((updated as Record<string, unknown>)[patch.field] as Record<string, unknown>)[patch.subfield!] = patch.new_value;
    } else {
      (updated as Record<string, unknown>)[patch.field] = patch.new_value;
    }
  }

  return updated;
}
