import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { generateCharacterCard, renderCharacterPrompt } from '@/lib/claude';
import { renderQuestionnaireContext } from '@/lib/questionnaire';

// POST /api/create/questionnaire — 根据问卷答案重新生成 CharacterCard
export async function POST(request: NextRequest) {
  try {
    const { avatarId, answers, name, relationship, keywords, description } = await request.json();

    if (!avatarId || !answers) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 });
    }

    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 重新生成 CharacterCard，包含问卷上下文
    const questionnaireContext = renderQuestionnaireContext(answers);
    const characterCard = await generateCharacterCard({
      name,
      relationship,
      keywords,
      description: (description || '') + questionnaireContext,
    });
    const systemPrompt = renderCharacterPrompt(characterCard);

    // 更新分身
    const { error } = await supabase
      .from('avatars')
      .update({
        character_card: characterCard,
        system_prompt: systemPrompt,
        profile: { keywords, description, questionnaire_answers: answers },
        creation_step: 1,
      })
      .eq('id', avatarId)
      .eq('user_id', user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, characterCard });
  } catch (err) {
    console.error('Questionnaire error:', err);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
