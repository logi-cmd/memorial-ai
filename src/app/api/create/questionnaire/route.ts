import { NextRequest, NextResponse } from 'next/server';
import { getAvatarById, updateAvatar } from '@/lib/db';
import { getAppConfig } from '@/lib/providers/config';
import { getLLMProvider } from '@/lib/providers';
import { generateCharacterCard, renderCharacterPrompt } from '@/lib/claude';
import { renderQuestionnaireContext } from '@/lib/questionnaire';

export async function POST(request: NextRequest) {
  try {
    const { avatarId, answers, name, relationship, keywords, description } = await request.json();

    if (!avatarId || !answers) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const config = getAppConfig();
    const questionnaireContext = renderQuestionnaireContext(answers);

    let characterCard;
    if (config.mode === 'local') {
      const llmMod = getLLMProvider(config);
      const prompt = `你是一位语言风格分析专家。请根据以下信息，为 ${name} 生成结构化的 Character Card。

名字：${name}
与用户的关系：${relationship}
性格关键词：${(keywords || []).join('、')}
${(description || '') + questionnaireContext}

请输出 JSON 格式的人物卡片。`;
      const response = await llmMod.ollamaGenerate(prompt);
      try {
        characterCard = JSON.parse(response);
      } catch {
        characterCard = null;
      }
    }

    if (!characterCard) {
      characterCard = await generateCharacterCard({
        name,
        relationship,
        keywords: keywords || [],
        description: (description || '') + questionnaireContext,
      });
    }

    const systemPrompt = renderCharacterPrompt(characterCard);

    updateAvatar(avatarId, {
      character_card: characterCard,
      creation_step: 1,
    });

    return NextResponse.json({ success: true, characterCard });
  } catch (err) {
    console.error('Questionnaire error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
