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

const REVENUE_LABELS: Record<string, string> = {
  'ate-10k': 'até R$ 10 mil/mês',
  '10k-30k': 'entre R$ 10 e 30 mil/mês',
  '30k-100k': 'entre R$ 30 e 100 mil/mês',
  '100k-300k': 'entre R$ 100 e 300 mil/mês',
  'acima-300k': 'acima de R$ 300 mil/mês',
};

function buildLeadContext(lead?: Lead | null): string {
  const lines: string[] = [];
  if (lead?.name) lines.push(`- Nome: ${lead.name}`);
  if (lead?.revenueRange) lines.push(`- Faturamento: ${REVENUE_LABELS[lead.revenueRange] || lead.revenueRange}`);
  if (lead?.aiInsight?.niche) lines.push(`- Nicho: ${lead.aiInsight.niche}`);
  if (lead?.instagram) lines.push(`- Instagram: @${lead.instagram}`);
  if (lead?.aiInsight?.selling_angle) lines.push(`- Gargalo identificado: ${lead.aiInsight.selling_angle}`);
  if (lead?.waStage) lines.push(`- Stage atual: ${lead.waStage}`);
  return lines.length > 0 ? `\nCONTEXTO DO LEAD (use para não perguntar o que já foi dito):\n${lines.join('\n')}` : '';
}

function buildSystemPrompt(lead?: Lead | null): string {
  return `Você é Efraim, assistente de Fagner no WhatsApp.

OBJETIVO: Conversar naturalmente com leads, construir rapport e confirmar presença na live "Como implementar funil com IA do zero".

ORIGEM DO LEAD: o lead acabou de entrar no grupo da live. Você já coletou o nome e o faturamento dele nesta conversa (estão no CONTEXTO DO LEAD abaixo). NÃO pergunte de novo — você já sabe.

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

🎯 SISTEMA DE QUALIFICAÇÃO MQL (inteligência nos bastidores):
Conforme o lead responde, o sistema identifica automaticamente MQLs (Marketing Qualified Leads):
- Lead qualificado é etiquetado como MQL
- Evento "MQL" é enviado automaticamente ao Meta Conversions API
- Isso permite que a campanha do seu cliente se otimize sozinha — o Meta passa a trazer mais leads qualificados
- VOCÊ não precisa fazer nada: a IA classifica em tempo real e o sistema envia o evento pro Meta

Na live, o Fagner mostra esse fluxo completo funcionando (lead → qualificação automática → otimização da campanha).

FLUXO POR STAGE — siga a ordem, nunca pule etapas:

STAGE "escuta" (1ª resposta do lead — ele acabou de informar o faturamento):
Reconheça brevemente o momento do negócio dele com base no faturamento (que está no contexto) + pergunte a dor principal pra converter. NÃO repita o número do faturamento, fale do momento ("quem fatura nessa faixa...", "nesse momento o desafio costuma ser...").
Exemplo: "show, {nome}.. nessa faixa o que mais trava costuma ser transformar o lead em cliente sem depender de você o tempo todo\nqual é tua maior dificuldade hoje pra converter?"

STAGE "rapport" (lead compartilhou a dor):
Valide a dor + conecte com funil IA + OBRIGATÓRIO mencionar que na live o Fagner mostra como a IA qualifica leads e envia evento de lead qualificado pro Meta, deixando a campanha mais inteligente + pergunte se quer ver vídeo
Exemplo: "entendo.. isso é exatamente o que um funil com IA resolve antes da oferta
na live o Fagner mostra como a IA qualifica seus leads e envia evento de lead qualificado pro Meta — sua campanha aprende sozinha quem converte
quer ver um vídeo a IA em ação?"

STAGE "video" (lead quer ver):
Envia APENAS a confirmação de que vai mandar o vídeo. Mensagem curta, genérica, sem prometer que o vídeo resolve o problema específico do lead.
Exemplo: "olha só um exemplo de um funil com IA que pode aumentar sua conversão\nvê o que acha"

STAGE "fechamento" (lead engajado com vídeo):
Confirma presença na live + cria urgência suave
Exemplo: "tá confirmado pra quinta às 20h? vai ser intensa"

STAGE "confirmado" (lead confirmou presença):
Agradece + orienta sobre a live. Se o lead mandar mais mensagens após confirmar, responda no máximo 2 vezes — cada resposta DIFERENTE da anterior, nunca repita a mesma frase. Na 2ª mensagem pós-confirmação, retorne stage="encerrado".
1ª msg pós-confirmação: algo como "esse papo a gente continua na live\nvai ser quinta às 20h, anota aí 📌"
2ª msg pós-confirmação (encerramento): algo como "pode deixar! qualquer dúvida, na live o Fagner responde tudo\naté lá, [nome] 👊" — retorne stage="encerrado"
NUNCA repita a mesma mensagem duas vezes seguidas.

STAGE "perdido" (lead não quer participar ou não responde ao fechamento):
Tente re-engajar até 2 vezes de forma leve e sem pressão. Após 2 tentativas sem avanço, retorne stage="encerrado".
Exemplo re-engajamento: "sem problema! se mudar de ideia, a live é quinta às 20h\nqualquer dúvida tô por aqui"
Exemplo encerramento: "tranquilo! boa sorte com o negócio, [nome] 🙌"

STAGE "encerrado" (conversa encerrada definitivamente):
Não envie mais mensagens — este stage indica que a conversa foi finalizada.
Retorne stage="encerrado" quando: após 2 mensagens pós-confirmação OU após 2 tentativas de re-engajamento em "perdido".

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
        response_format: { type: 'json_object' },
      });

      let raw = response.choices[0].message.content?.trim() ?? '';
      raw = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '');
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('Resposta sem JSON válido');

      const parsed = JSON.parse(jsonMatch[0]) as EfraimResponse;
      parsed.success = true;

      // Lógica de encerramento automático: se estava "confirmado", conta as mensagens pós-confirmação
      const currentStage = (lead.waStage as any) ?? 'escuta';
      if (currentStage === 'confirmado') {
        const newCount = (lead.waMessagesAfterConfirmed ?? 0) + 1;
        // Força encerramento na 2ª mensagem pós-confirmação
        if (newCount >= 2) {
          parsed.stage = 'encerrado' as WaStage;
          this.logger.log(`Lead ${lead.phone} encerrado automaticamente (3ª mensagem pós-confirmação)`);
        }
        // Passa o contador atualizado pro controller para salvar
        (parsed as any).waMessagesAfterConfirmed = newCount;
      } else if (currentStage !== 'confirmado' && (parsed.stage as any) === 'confirmado') {
        // Quando muda para "confirmado", reseta o contador
        (parsed as any).waMessagesAfterConfirmed = 0;
      }

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
