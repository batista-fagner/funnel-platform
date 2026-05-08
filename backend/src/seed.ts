import { createConnection } from 'typeorm';
import { v4 as uuid } from 'uuid';
import { Form } from './common/entities/form.entity';

// Fixed UUID for 'default' form (namespace-based UUID)
const DEFAULT_FORM_ID = '00000000-0000-0000-0000-000000000001';

async function seed() {
  const connection = await createConnection({
    type: 'postgres',
    url: process.env.SUPABASE_DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: ['src/common/entities/*.entity.ts'],
    synchronize: true,
  });

  const fields = [
    { id: '1', name: 'revenue', label: 'Qual é o faturamento mensal do seu negócio?', type: 'select', options: ['Acima de R$ 30 mil', 'Entre R$ 10k e R$ 30k', 'Abaixo de R$ 10 mil'] },
    { id: '2', name: 'lead_pain', label: 'Você tem dificuldade em gerar ou qualificar leads?', type: 'select', options: ['Sim, é meu maior gargalo', 'Um pouco', 'Não, estou bem servido'] },
  ];

  await connection.query(
    `INSERT INTO forms (id, name, fields, created_at, updated_at)
     VALUES ($1, $2, $3, NOW(), NOW())
     ON CONFLICT (id) DO UPDATE SET updated_at = NOW()`,
    [DEFAULT_FORM_ID, 'Formulário Padrão', JSON.stringify(fields)]
  );

  console.log(`✅ Form 'default' criado com ID: ${DEFAULT_FORM_ID}`);
  await connection.close();
}

seed().catch(err => {
  console.error('❌ Erro ao executar seed:', err);
  process.exit(1);
});
