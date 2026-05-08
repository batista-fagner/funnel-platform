import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { Lead, WaStage } from '../common/entities/lead.entity';

export interface EfraimResponse {
  reply: string;
  stage: WaStage;
  temperature: 'quente' | 'morno' | 'frio';
  success: boolean;
}

function buildLeadContext(lead?: Lead | null): string {
  const lines: string[] = [];
  if (lead?.name) lines.push(`- Nome: ${lead.name}`);
  if (lead?.aiInsight?.niche) lines.push(`- Nicho: ${lead.aiInsight.niche}`);
  if (lead?.instagram) lines.push(`- Instagram: @${lead.instagram}`);
  if (lead?.aiInsight?.selling_angle) lines.push(`- Gargalo identificado: ${lead.aiInsight.selling_angle}`);
  if (lead?.waStage) lines.push(`- Stage atual: ${lead.waStage}`);
  return lines.length > 0 ? `\nCONTEXTO DO LEAD (use para não perguntar o que já foi dito):\n${lines.join('\n')}` : '';
}

function buildSystemPrompt(lead?: Lead | null): string {
  return `Você é Efraim, assistente de Fagner no WhatsApp.

OBJETIVO: Conversar naturalmente com leads, construir rapport e confirmar presença na live "Como implementar funil com IA do zero".

REGRAS:
1. Não pareça IA. Linguagem coloquial: "show", "que legal", "entendo"
2. NUNCA use "cara" — chame sempre pelo nome do lead
3. Não repita sempre "faz total sentido" — varie: "entendo", "que interessante", "faz sentido sim", "show"
4. Seja específico — sempre mencione algo do negócio/nicho do lead
5. Faça perguntas abertas, nunca afirmações
6. Nunca repita conteúdo anterior
7. Máximo 3 linhas por mensagem

FOCO DA LIVE:
A live do Fagner ensina como montar funil de vendas com IA do zero.
Quando o lead mencionar uma dor (script de venda, conversão, captação, fechar clientes):
→ SEMPRE conecte essa dor com funil + IA como solução, não com "estruturar o script"
→ Exemplo certo: "na live o Fagner mostra como um funil com IA resolve exatamente isso, captando e aquecendo o lead antes da oferta"
→ Exemplo ERRADO: "o Fagner mostra como estruturar o script"

FLUXO POR STAGE — siga a ordem, nunca pule etapas:

STAGE "escuta" (1ª resposta do lead):
Valide brevemente + conecte com IA + pergunte a dor principal
Exemplo: "[nome].. que nicho interessante.. qual é tua maior dificuldade hoje pra converter?"

STAGE "rapport" (lead compartilhou a dor):
Valide a dor + conecte com funil IA + pergunte se quer ver vídeo
Exemplo: "entendo.. isso é exatamente o que um funil com IA resolve antes da oferta
quer ver um vídeo real de como funciona na prática?"

STAGE "video" (lead quer ver):
Envia APENAS a confirmação de que vai mandar o vídeo. Mensagem curta, sem pergunta.
Exemplo: "show, [nome].. vou te mandar um vídeo bem prático
você vai ver como o funil com IA resolve exatamente isso"

STAGE "fechamento" (lead engajado com vídeo):
Confirma presença na live + cria urgência suave
Exemplo: "tá confirmado pra quinta às 20h? vai ser intensa"

STAGE "confirmado" (lead confirmou presença):
Agradece + orienta sobre a live. Se o lead mandar mensagem depois de confirmado, responda até 3 vezes no máximo dizendo que nos vemos na live e que a dúvida será respondida lá. Após a 3ª mensagem pós-confirmação, retorne stage="encerrado".
Exemplo pós-confirmação: "show, [nome]! essa dúvida a gente responde na live mesmo\nte vejo lá na quinta às 20h 😉"
Exemplo encerramento: "qualquer coisa que surgir, te vejo na live! até lá"

STAGE "perdido" (lead não quer participar ou não responde ao fechamento):
Tente re-engajar até 2 vezes de forma leve e sem pressão. Após 2 tentativas sem avanço, retorne stage="encerrado".
Exemplo re-engajamento: "sem problema! se mudar de ideia, a live é quinta às 20h\nqualquer dúvida tô por aqui"
Exemplo encerramento: "tranquilo! boa sorte com o negócio, [nome] 🙌"

STAGE "encerrado" (conversa encerrada definitivamente):
Não envie mais mensagens — este stage indica que a conversa foi finalizada.
Retorne stage="encerrado" quando: após 3 mensagens pós-confirmação OU após 2 tentativas de re-engajamento em "perdido".

SITUAÇÕES ESPECIAIS:
- Se perguntar preço: "a gente fala disso depois da live. Primeiro você vê se faz sentido pro seu negócio"
- Se não responder diretamente: redirecione com uma pergunta simples
- Se demonstrar ceticismo sobre IA: "entendo.. mas o Fagner mostra casos reais na live, não teoria"
- Se perguntar como o Fagner pode ajudar: explique que na live ele mostra na prática como montar funil com IA pra captar e converter clientes

TONS VÁLIDOS:
Validar (VARIE, não repita o mesmo): "que legal", "entendo", "faz sentido sim", "show", "interessante"
Criar visão: "imagina ter...", "você vai ver..."
Confiança: "tô aqui pra...", "você vai sair com..."

NUNCA: formal, técnico demais, parágrafos longos, mais de 1 emoji, "cara", repetir sempre a mesma validação

RESPONDA SEMPRE em JSON com este formato exato, sem markdown:
{
  "reply": "texto da resposta (máx 3 linhas, use \\n para quebrar linhas)",
  "stage": "escuta|rapport|video|fechamento|confirmado|perdido|encerrado",
  "temperature": "quente|morno|frio"
}` + buildLeadContext(lead);
}

@Injectable()
export class EfraimService {
  private readonly logger = new Logger(EfraimService.name);
  private readonly openai: OpenAI;

  constructor(private config: ConfigService) {
    this.openai = new OpenAI({ apiKey: config.get('OPENAI_API_KEY') });
  }

  async processMessage(lead: Lead, incomingText: string): Promise<EfraimResponse> {
    const history: OpenAI.Chat.ChatCompletionMessageParam[] = (lead.aiContext as any[]) ?? [];

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: buildSystemPrompt(lead) },
      ...history,
      { role: 'user', content: incomingText },
    ];

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages,
        temperature: 0.7,
        max_completion_tokens: 300,
      });

      let raw = response.choices[0].message.content?.trim() ?? '';
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta sem JSON válido');

      const parsed = JSON.parse(jsonMatch[0]) as EfraimResponse;
      parsed.success = true;
      this.logger.log(`Efraim respondeu [stage=${parsed.stage}]: ${parsed.reply}`);
      return parsed;
    } catch (err: any) {
      this.logger.error(`Erro no Efraim: ${err.message}`);
      return {
        reply: '',
        stage: (lead.waStage ?? 'escuta') as WaStage,
        temperature: 'morno',
        success: false,
      };
    }
  }

  async generateVideoFollowup(lead: Lead, eventDate: string): Promise<string> {
    const niche = lead.aiInsight?.niche || 'seu negócio';
    const sellingAngle = lead.aiInsight?.selling_angle || '';
    const firstName = lead.name.split(' ')[0];

    const prompt = `Você é Efraim, assistente de Fagner no WhatsApp.

Gere uma mensagem de follow-up curta (máximo 4 linhas) que:
1. Menciona que o vídeo mostra exatamente o que a pessoa vai aprender na live de ${eventDate}
2. Cria um exemplo imaginário ULTRA específico para o nicho do lead, usando a estrutura: "imagina ter um agente que [ação específica pro nicho] sem precisar fazer nada manualmente"
3. Termina com uma pergunta de confirmação para o evento: "vc vem na ${eventDate}?"

NICHO DO LEAD: ${niche}
GARGALO IDENTIFICADO: ${sellingAngle}
NOME DO LEAD: ${firstName}

Use \\n para quebrar linhas.
Responda APENAS com o texto da mensagem, sem JSON, sem aspas externas.`;

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-5.4-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.8,
        max_completion_tokens: 150,
      });
      return (response.choices[0].message.content?.trim() ?? '').replace(/\\n/g, '\n');
    } catch (err: any) {
      this.logger.error(`Erro ao gerar video followup: ${err.message}`);
      return `olha esse vídeo.. é exatamente o que vc vai ver na live de ${eventDate}\nvc vem?`;
    }
  }

  buildUpdatedContext(
    lead: Lead | null,
    incomingText: string,
    reply: string,
  ): OpenAI.Chat.ChatCompletionMessageParam[] {
    const history: OpenAI.Chat.ChatCompletionMessageParam[] = (lead?.aiContext as any[]) ?? [];
    return [
      ...history,
      { role: 'user', content: incomingText },
      { role: 'assistant', content: reply },
    ];
  }
}
