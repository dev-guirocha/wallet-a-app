# Wallet.a - Sistema de Gestão Financeira para Autônomos

*Sua solução completa para gestão de contratos, pagamentos e agenda*

## 📌 Visão Geral

O **Wallet.a** é uma aplicação web projetada para profissionais autônomos que desejam gerenciar seus contratos, controle financeiro e agenda de compromissos em um único lugar. Com interface intuitiva e recursos poderosos, você pode:

- 📊 Visualizar seu fluxo de receita mensal
- 📅 Gerenciar sua agenda de aulas/compromissos
- 💰 Acompanhar pagamentos pendentes e recebidos
- 👥 Administrar seus clientes e contratos

## ✨ Funcionalidades Principais

### 📈 Dashboard Financeiro
- Visão geral mensal de receitas
- Gráficos de distribuição de receita por local
- Lista de pagamentos pendentes

### 📅 Agenda Inteligente
- Calendário mensal com marcação de compromissos
- Visualização diária de aulas/compromissos
- Identificação visual de dias com atividades

### 📝 Gestão de Contratos
- Cadastro completo de clientes
- Controle de valores mensais e dias de vencimento
- Registro de dias e horários de aulas
- Marcação de pagamentos recebidos

### 🔐 Autenticação Segura
- Login com Google ou email/senha
- Cadastro de novos usuários
- Proteção de dados com Firebase

## 🛠 Tecnologias Utilizadas

- **Frontend**: 
  - ![HTML5](https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white)
  - ![CSS3](https://img.shields.io/badge/-CSS3-1572B6?logo=css3&logoColor=white)
  - ![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black)
  - ![Tailwind CSS](https://img.shields.io/badge/-Tailwind_CSS-38B2AC?logo=tailwind-css&logoColor=white)
  - ![Chart.js](https://img.shields.io/badge/-Chart.js-FF6384?logo=chart.js&logoColor=white)

- **Backend**:
  - ![Firebase](https://img.shields.io/badge/-Firebase-FFCA28?logo=firebase&logoColor=black)
    - Authentication
    - Firestore Database
    - Hosting

## 🚀 Como Executar o Projeto

### Pré-requisitos
- Navegador moderno (Chrome, Firefox, Edge)
- Conta no Firebase (para configuração personalizada)

### Instalação Local
1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/wallet-a.git
   ```
2. Acesse a pasta do projeto:
   ```bash
   cd wallet-a
   ```
3. Abra o arquivo `index.html` no seu navegador

### Configuração do Firebase
1. Crie um projeto no [Firebase Console](https://console.firebase.google.com/)
2. Adicione um aplicativo Web ao seu projeto
3. Substitua as configurações no arquivo `app.js`:
   ```javascript
   const firebaseConfig = {
     apiKey: "SUA_API_KEY",
     authDomain: "SEU_PROJETO.firebaseapp.com",
     projectId: "SEU_PROJETO",
     storageBucket: "SEU_PROJETO.appspot.com",
     messagingSenderId: "SEU_SENDER_ID",
     appId: "SEU_APP_ID"
   };
   ```

## 📝 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🤝 Contribuição

Contribuições são bem-vindas! Siga estes passos:

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## ✉️ Contato

Para dúvidas ou sugestões, entre em contato:

- Email: dev.guirocha@gmail.com
- GitHub: [@dev-guirocha](https://github.com/dev-guirocha)

---

Desenvolvido com ❤️ por [Guilherme Rocha] - © 2025 Wallet.a
