import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

const ACCENT = '#0D9F6E';

export default function TermsPage() {
  const [, navigate] = useLocation();

  return (
    <div style={{
      minHeight: '100dvh', background: 'var(--bg)',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
      color: 'var(--text-1)',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '24px 20px 60px' }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-2)', fontSize: 14, fontWeight: 500,
            padding: '0 0 28px', fontFamily: 'inherit',
          }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>

        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6, letterSpacing: '-0.5px' }}>
          Termos de Uso
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 36 }}>
          Última atualização: março de 2026
        </p>

        {[
          {
            title: '1. Aceitação dos Termos',
            body: 'Ao acessar ou usar o IA Calorias, você concorda com estes Termos de Uso. Se não concordar com qualquer parte destes termos, não utilize o serviço.',
          },
          {
            title: '2. Descrição do Serviço',
            body: 'O IA Calorias é um aplicativo de contagem de calorias que utiliza inteligência artificial (GPT-4o Vision) para analisar fotos de refeições e estimar informações nutricionais. O serviço oferece planos gratuito e pagos (Limitado e Ilimitado).',
          },
          {
            title: '3. Uso Permitido',
            body: 'Você concorda em usar o serviço somente para fins pessoais e lícitos. É proibido usar o serviço para qualquer finalidade ilegal, enviar conteúdo ofensivo ou tentar comprometer a segurança da plataforma.',
          },
          {
            title: '4. Precisão das Informações Nutricionais',
            body: 'As estimativas calóricas e nutricionais fornecidas pela IA são aproximadas e têm caráter informativo. Não substituem orientação de nutricionista ou médico. Para decisões de saúde relevantes, consulte sempre um profissional.',
          },
          {
            title: '5. Planos e Pagamentos',
            body: 'Os planos pagos são cobrados mensalmente via Stripe. Você pode cancelar a qualquer momento. Não realizamos reembolsos por períodos já pagos. Os preços podem ser alterados com aviso prévio de 30 dias.',
          },
          {
            title: '6. Propriedade Intelectual',
            body: 'Todo o conteúdo do IA Calorias — incluindo marca, design, código e textos — é de propriedade exclusiva do serviço e protegido por lei. Você não pode copiar, modificar ou redistribuir sem autorização expressa.',
          },
          {
            title: '7. Limitação de Responsabilidade',
            body: 'O IA Calorias não se responsabiliza por danos diretos ou indiretos decorrentes do uso ou incapacidade de uso do serviço, perda de dados, ou resultados de saúde baseados nas análises fornecidas.',
          },
          {
            title: '8. Alterações nos Termos',
            body: 'Reservamo-nos o direito de alterar estes termos a qualquer momento. Mudanças significativas serão comunicadas por e-mail ou notificação no app com antecedência mínima de 7 dias.',
          },
          {
            title: '9. Contato',
            body: 'Para dúvidas sobre estes Termos, entre em contato pelo e-mail: atendimento.iacalorias@hotmail.com ou pelo WhatsApp: (11) 95653-8845.',
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7 }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
