import React from 'react';
import { useLocation } from 'wouter';
import { ArrowLeft } from 'lucide-react';

const ACCENT = '#0D9F6E';

export default function PrivacyPage() {
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
          Política de Privacidade
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', marginBottom: 36 }}>
          Última atualização: março de 2026 · Em conformidade com a LGPD (Lei nº 13.709/2018)
        </p>

        {[
          {
            title: '1. Quem Somos',
            body: 'O IA Calorias é um serviço de análise nutricional por inteligência artificial. Somos responsáveis pelo tratamento dos seus dados pessoais conforme descrito nesta política.',
          },
          {
            title: '2. Dados que Coletamos',
            body: 'Coletamos: (a) dados de conta — nome, e-mail e senha criptografada quando você cria uma conta; (b) fotos de refeições enviadas para análise, processadas pela OpenAI e não armazenadas permanentemente; (c) dados de uso — análises realizadas, metas nutricionais, histórico de treinos e progresso; (d) dados de pagamento — gerenciados exclusivamente pelo Stripe, não temos acesso ao número do seu cartão.',
          },
          {
            title: '3. Como Usamos seus Dados',
            body: 'Utilizamos seus dados para: fornecer o serviço de análise nutricional e de treinos; personalizar metas e recomendações; processar pagamentos de assinatura; enviar comunicações sobre o serviço (com sua autorização); melhorar a qualidade e precisão das análises.',
          },
          {
            title: '4. Compartilhamento com Terceiros',
            body: 'Compartilhamos dados apenas com: (a) OpenAI — imagens de refeições para processamento via GPT-4o Vision, sujeitas à política de privacidade da OpenAI; (b) Stripe — dados de pagamento, sujeitos à política do Stripe; (c) Railway — provedor de hospedagem da infraestrutura; (d) Google Analytics (GA4) — dados de uso anônimos para análise de desempenho do app, sem identificação pessoal. Não vendemos seus dados pessoais a terceiros.',
          },
          {
            title: '5. Retenção de Dados',
            body: 'Mantemos seus dados enquanto sua conta estiver ativa. As fotos enviadas para análise são processadas em tempo real e não ficam armazenadas permanentemente nos nossos servidores. Dados de conta e histórico são mantidos por até 5 anos após o encerramento da conta para fins legais.',
          },
          {
            title: '6. Seus Direitos (LGPD)',
            body: 'Conforme a Lei Geral de Proteção de Dados, você tem direito a: confirmar a existência de tratamento; acessar seus dados; corrigir dados incompletos ou incorretos; solicitar a eliminação dos seus dados; portabilidade de dados; revogar consentimento a qualquer momento. Para exercer qualquer direito, envie e-mail para: privacidade@iacalorias.com.br',
          },
          {
            title: '7. Segurança',
            body: 'Adotamos medidas técnicas e organizacionais para proteger seus dados, incluindo: senhas armazenadas com hash bcrypt, comunicações via HTTPS/TLS, acesso restrito ao banco de dados e monitoramento contínuo de segurança.',
          },
          {
            title: '8. Cookies e Armazenamento Local',
            body: 'Utilizamos localStorage no seu navegador para armazenar preferências de sessão, configurações do app e histórico de uso offline. Utilizamos o Google Analytics (GA4) para medir o uso do serviço de forma anônima — nenhum dado pessoal identificável é enviado ao Google. Não utilizamos cookies de publicidade comportamental.',
          },
          {
            title: '9. Menores de Idade',
            body: 'O IA Calorias não é direcionado a menores de 13 anos. Não coletamos intencionalmente dados de crianças. Se identificarmos dados de menores, iremos excluí-los imediatamente.',
          },
          {
            title: '10. Contato e DPO',
            body: 'Para questões sobre privacidade ou exercício de direitos LGPD, entre em contato:\n\nE-mail: atendimento.iacalorias@hotmail.com\nWhatsApp: (11) 95653-8845\n\nResponderemos em até 15 dias úteis.',
          },
        ].map(({ title, body }) => (
          <div key={title} style={{ marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: ACCENT, marginBottom: 8 }}>{title}</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, whiteSpace: 'pre-line' }}>{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
