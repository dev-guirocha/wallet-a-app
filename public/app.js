// =============================================
// Importações e Configuração do Firebase
// =============================================

// Importações do Firebase v9 (mantenha como está no seu código)
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-firestore.js";

// Configuração do Firebase (substitua pelos seus dados reais)
const firebaseConfig = {
  apiKey: "AIzaSyAGJ_IEEuwLpl-ZZOaNumYxMwWIuIR_GAA",
  authDomain: "wallet-a-personal.firebaseapp.com",
  projectId: "wallet-a-personal",
  storageBucket: "wallet-a-personal.firebasestorage.app",
  messagingSenderId: "391893025714",
  appId: "1:391893025714:web:71931237b58760f1ebdaab"
};

// =============================================
// Utilitários (MOVIDO PARA O TOPO)
// =============================================

// Exibição de erros críticos (precisa estar no topo)
const showFatalError = (message) => {
    document.body.innerHTML = `
      <div class="min-h-screen flex items-center justify-center bg-gray-900 p-4">
        <div class="bg-gray-800 p-6 rounded-lg border border-red-500 max-w-md">
          <h2 class="text-xl font-bold text-red-400 mb-2">Erro Crítico</h2>
          <p class="text-gray-300 mb-4">${message}</p>
          <button onclick="window.location.reload()" class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded">
            Recarregar Página
          </button>
        </div>
      </div>
    `;
};

// Formatação de valores monetários
const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    });
};

// Verifica se elemento existe antes de acessar
const getElement = (selector, required = true) => {
    const element = document.querySelector(selector);
    if (!element && required) {
      console.error(`Elemento não encontrado: ${selector}`);
      // Lançar um erro aqui pode ser muito agressivo, talvez apenas retorne null
      // e deixe a função que chamou lidar com isso. Mas por enquanto, mantemos.
      throw new Error(`Elemento ${selector} não encontrado`);
    }
    return element;
};


// =============================================
// Inicialização do Firebase (NOVO BLOCO)
// =============================================

let app, auth, db;
try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);

    // Disponibiliza as funções para o código legado que espera o "window.firebase"
    // Esta é uma "ponte" para não ter que reescrever tudo agora.
    window.firebase = {
        initializeApp, auth: () => auth, firestore: () => db, 
        GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword,
        createUserWithEmailAndPassword, onAuthStateChanged, signOut,
        collection, addDoc, onSnapshot, query, doc, updateDoc, deleteDoc,
        serverTimestamp
    };

    console.log("Firebase inicializado com sucesso");
} catch (error) {
    console.error("Erro ao inicializar Firebase:", error);
    showFatalError("Erro ao conectar com o servidor. Recarregue a página.");
}

const appId = "wallet-a-app"; // ID da aplicação (pode manter onde estava ou mover para cá)


// =============================================
// Estado Global da Aplicação
// =============================================
const state = {
  currentUser: null,
  contracts: [],
  contractsListener: null,
  currentPage: 'dashboard-page',
  editingContractId: null,
  revenueChart: null,
  calendarDate: new Date()
};

// =============================================
// Módulo de Autenticação
// =============================================
const authModule = {
  // Observador de estado de autenticação
  setupAuthListener() {
    window.firebase.onAuthStateChanged(auth, (user) => {
      if (user) {
        this.handleLogin(user);
      } else {
        this.handleLogout();
      }
    });
  },

  // Trata login do usuário
  handleLogin(user) {
    state.currentUser = user;
    console.log("Usuário logado:", user.email);
    
    try {
      // Mostra a interface do app
      getElement('#app-shell').classList.remove('hidden');
      getElement('#landing-container').classList.add('hidden');
      getElement('#user-display').textContent = user.email || 'Usuário';
      
      // Carrega dados do usuário
      dataModule.setupDataListeners(user.uid);
      
      // Navega para a página atual
      navigationModule.navigateTo(state.currentPage);
    } catch (error) {
      console.error("Erro no login:", error);
      this.handleLogout();
    }
  },

  // Trata logout do usuário
  handleLogout() {
    state.currentUser = null;
    console.log("Usuário deslogado");
    
    // Limpa listeners e dados
    if (state.contractsListener) {
      state.contractsListener();
      state.contractsListener = null;
    }
    
    state.contracts = [];
    
    // Mostra a landing page
    getElement('#app-shell').classList.add('hidden');
    getElement('#landing-container').classList.remove('hidden');
  },

  // Login com Google
  async loginWithGoogle() {
    try {
      const provider = new window.firebase.GoogleAuthProvider();
      await window.firebase.signInWithPopup(auth, provider);
      const authModal = getElement('#auth-modal', false);
      if (authModal) authModal.classList.add('hidden');
    } catch (error) {
      console.error("Erro no login com Google:", error);
      this.showAuthError("Falha no login com Google");
    }
  },

  // Login com email/senha
  async loginWithEmail(email, password) {
    try {
      await window.firebase.signInWithEmailAndPassword(auth, email, password);
      this.closeAuthModal();
    } catch (error) {
      console.error("Erro no login:", error);
      this.showAuthError("Email ou senha inválidos");
    }
  },

  // Cadastro com email/senha
  async signupWithEmail(email, password) {
    try {
      await window.firebase.createUserWithEmailAndPassword(auth, email, password);
      this.closeAuthModal();
    } catch (error) {
      console.error("Erro no cadastro:", error);
      this.showAuthError("Erro ao criar conta. Tente outro email.");
    }
  },

  // Logout
  async logout() {
    try {
      await window.firebase.signOut(auth);
    } catch (error) {
      console.error("Erro no logout:", error);
    }
  },

  // Mostra erro no modal de auth
  showAuthError(message) {
    const errorEl = getElement('#auth-error', false);
    if (errorEl) {
      errorEl.textContent = message;
      setTimeout(() => errorEl.textContent = '', 5000);
    }
  },

  // Fecha modal de auth
  closeAuthModal() {
    const authModal = getElement('#auth-modal', false);
    if (authModal) authModal.classList.add('hidden');
  }
};

// =============================================
// Módulo de Navegação
// =============================================
const navigationModule = {
  // Inicializa navegação
  init() {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        this.navigateTo(item.dataset.page);
      });
    });
    
    // Botão de adicionar cliente (FAB)
    getElement('#fab-add-client').addEventListener('click', () => {
      contractModule.showContractModal();
    });
    
    // Botão de logout
    getElement('#logout-btn').addEventListener('click', authModule.logout);
  },

  // Navega para uma página específica
  navigateTo(pageId) {
    state.currentPage = pageId;
    
    // Esconde todas as páginas
    document.querySelectorAll('.page-content').forEach(page => {
      page.classList.add('hidden');
    });
    
    // Mostra a página atual
    getElement(`#${pageId}`).classList.remove('hidden');
    
    // Atualiza itens de navegação ativos
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === pageId);
    });
    
    // Mostra/oculta FAB conforme a página
    getElement('#fab-add-client').classList.toggle(
      'hidden', 
      pageId !== 'dashboard-page'
    );
    
    // Atualiza a página específica se necessário
    if (pageId === 'dashboard-page') {
      dashboardModule.updateDashboard();
    } else if (pageId === 'agenda-page') {
      agendaModule.renderCalendar();
    } else if (pageId === 'contracts-page') {
      dataModule.renderContractsTable();
    }
  }
};

// =============================================
// Módulo de Dashboard
// =============================================
const dashboardModule = {
  // Atualiza o dashboard com os dados atuais
  updateDashboard() {
    if (!state.currentUser) return;
    
    const { contracts } = state;
    const listEl = getElement('#dashboard-payments-list');
    listEl.innerHTML = '';
    
    // Calcula totais
    const stats = contracts.reduce((acc, c) => {
      acc.total += c.monthlyValue;
      if (c.paidThisMonth) {
        acc.recebido += c.monthlyValue;
    } else {
        acc.pendente += c.monthlyValue;
    }
      return acc;
    }, { total: 0, recebido: 0, pendente: 0 });
    
    // Atualiza totais
    getElement('#dashboard-total').textContent = formatCurrency(stats.total);
    getElement('#dashboard-recebido').textContent = formatCurrency(stats.recebido);
    getElement('#dashboard-pendente').textContent = formatCurrency(stats.pendente);
    
    // Filtra contratos não pagos
    const unpaidContracts = contracts.filter(c => !c.paidThisMonth);
    
    if (unpaidContracts.length === 0) {
      listEl.innerHTML = '<p class="text-gray-400">Todos os pagamentos estão em dia!</p>';
    } else {
      unpaidContracts.forEach(c => {
        const item = document.createElement('li');
        item.className = 'py-3 flex items-center';
        item.innerHTML = `
          <input type="checkbox" data-id="${c.id}" class="payment-checkbox form-checkbox">
          <div class="ml-4 flex-grow flex justify-between items-center">
            <div>
              <p class="font-semibold text-white">${c.studentName}</p>
              <p class="text-sm text-gray-400">Vence dia ${c.dueDay}</p>
            </div>
            <p class="font-bold text-lg text-white">${formatCurrency(c.monthlyValue)}</p>
          </div>
        `;
        listEl.appendChild(item);
      });
    }
    
    // Atualiza gráfico de receita
    this.updateRevenueChart();
    
    // Configura eventos dos checkboxes
    listEl.addEventListener('change', (e) => {
      if (e.target.matches('.payment-checkbox')) {
        contractModule.updatePaymentStatus(
          e.target.dataset.id, 
          e.target.checked
        );
      }
    });
  },
  
  // Atualiza o gráfico de receita
  updateRevenueChart() {
    const ctx = getElement('#revenueChart');
    if (!ctx) return;
    
    // Destrói gráfico existente
    if (state.revenueChart) {
      state.revenueChart.destroy();
    }
    
    // Agrupa receita por local
    const revenueByLocation = state.contracts
      .filter(c => c.paidThisMonth)
      .reduce((acc, c) => {
        const location = c.locationName || 'Outros';
        acc[location] = (acc[location] || 0) + c.monthlyValue;
        return acc;
      }, {});
    
    const labels = Object.keys(revenueByLocation);
    const data = Object.values(revenueByLocation);
    
    // Se não há dados, mostra mensagem
    if (labels.length === 0) {
      const context = ctx.getContext('2d');
      context.clearRect(0, 0, ctx.width, ctx.height);
      context.textAlign = 'center';
      context.fillStyle = '#6b7280';
      context.fillText('Nenhuma receita registrada este mês', ctx.width / 2, ctx.height / 2);
      return;
    }
    
    // Cria novo gráfico
    state.revenueChart = new Chart(ctx, {
      type: 'doughnut',
      data: { 
        labels, 
        datasets: [{ 
          data, 
          backgroundColor: [
            '#10b981', '#3b82f6', '#f59e0b', 
            '#ef4444', '#8b5cf6', '#ec4899'
          ],
          borderColor: '#111827',
          borderWidth: 4 
        }] 
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { 
          legend: { 
            position: 'bottom', 
            labels: { 
              color: '#d1d5db', 
              padding: 20 
            } 
          } 
        } 
      }
    });
  }
};

// =============================================
// Módulo de Contratos
// =============================================
const contractModule = {
  // Mostra modal para adicionar/editar contrato
  showContractModal(contractId = null) {
    const modal = getElement('#contract-modal');
    const form = getElement('#main-add-form');
    
    state.editingContractId = contractId;
    
    if (contractId) {
      // Modo edição
      const contract = state.contracts.find(c => c.id === contractId);
      if (!contract) return;
      
      getElement('#contract-modal-title').textContent = 'Editar Contrato';
      getElement('#contract-submit-btn').textContent = 'Salvar Alterações';
      getElement('#delete-contract-btn').classList.remove('hidden');
      
      // Preenche formulário
      form.studentName.value = contract.studentName;
      form.locationName.value = contract.locationName || '';
      form.classTime.value = contract.classTime;
      form.monthlyValue.value = contract.monthlyValue;
      form.dueDay.value = contract.dueDay;
      
      // Marca dias de aula e atualiza o estilo do label
      document.querySelectorAll('input[name=weekday]').forEach(cb => {
        const isChecked = (contract.weekdays || []).includes(cb.value);
        cb.checked = isChecked;
        const label = cb.nextElementSibling;
        if (label) {
          label.classList.toggle('border-emerald-500', isChecked);
          label.classList.toggle('bg-emerald-500/10', isChecked);
        }
      });
    } else {
      // Modo novo contrato
      getElement('#contract-modal-title').textContent = 'Adicionar Novo Cliente';
      getElement('#contract-submit-btn').textContent = 'Salvar Cliente';
      getElement('#delete-contract-btn').classList.add('hidden');
      form.reset();
      // Garante que os estilos dos checkboxes de dias sejam resetados
      document.querySelectorAll('input[name=weekday]').forEach(cb => {
        const label = cb.nextElementSibling;
        if(label) {
            label.classList.remove('border-emerald-500', 'bg-emerald-500/10');
        }
      });
    }
    
    modal.classList.remove('hidden');
  },
  
  // Salva contrato (cria ou atualiza)
  async saveContract(formData) {
    if (!state.currentUser) return;
    
    const contractData = {
      studentName: formData.studentName.value,
      locationName: formData.locationName.value || 'N/A',
      weekdays: Array.from(formData.querySelectorAll('input[name=weekday]:checked'))
        .map(cb => cb.value),
      classTime: formData.classTime.value,
      monthlyValue: parseFloat(formData.monthlyValue.value),
      dueDay: parseInt(formData.dueDay.value),
      paidThisMonth: false // Ao salvar, resetamos o pagamento do mês
    };
    
    const { doc, updateDoc, addDoc, collection, serverTimestamp } = window.firebase;
    const path = `artifacts/${appId}/users/${state.currentUser.uid}/contracts`;
    
    try {
      if (state.editingContractId) {
        // Atualiza contrato existente
        const docRef = doc(db, path, state.editingContractId);
        await updateDoc(docRef, contractData);
        console.log("Contrato atualizado:", state.editingContractId);
      } else {
        // Cria novo contrato
        contractData.userId = state.currentUser.uid;
        contractData.createdAt = serverTimestamp();
        await addDoc(collection(db, path), contractData);
        console.log("Novo contrato criado");
      }
      
      this.closeContractModal();
    } catch (error) {
      console.error("Erro ao salvar contrato:", error);
      alert("Erro ao salvar contrato. Tente novamente.");
    }
  },
  
  // Atualiza status de pagamento
  async updatePaymentStatus(contractId, isPaid) {
    if (!state.currentUser) return;
    
    try {
      const { doc, updateDoc } = window.firebase;
      const path = `artifacts/${appId}/users/${state.currentUser.uid}/contracts`;
      const docRef = doc(db, path, contractId);
      await updateDoc(docRef, { paidThisMonth: isPaid });
      console.log("Status de pagamento atualizado:", contractId, isPaid);
    } catch (error) {
      console.error("Erro ao atualizar pagamento:", error);
    }
  },

  // Mostra o modal de confirmação
  requestDeleteConfirmation() {
    if (!state.editingContractId) return;
    
    // Mostra nosso modal personalizado
    getElement('#delete-modal').classList.remove('hidden');
    
    // Adiciona um overlay para bloquear interação com outros elementos
    document.body.classList.add('modal-open');
  },
  
  // Executa a exclusão após confirmação
  async confirmDeleteContract() {
    if (!state.editingContractId || !state.currentUser) return;
    
    try {
      const { doc, deleteDoc } = window.firebase;
      const path = `artifacts/${appId}/users/${state.currentUser.uid}/contracts`;
      const docRef = doc(db, path, state.editingContractId);
      
      // Mostra loading
      getElement('#confirm-delete-btn').disabled = true;
      getElement('#confirm-delete-btn').innerHTML = `
        <span class="flex items-center justify-center">
          Excluindo...
          <div class="spinner ml-2"></div>
        </span>
      `;
      
      await deleteDoc(docRef);
      console.log("Contrato excluído:", state.editingContractId);
      
      // Fecha os modais
      this.closeDeleteModal();
      this.closeContractModal();
      
    } catch (error) {
      console.error("Erro ao excluir contrato:", error);
      alert("Erro ao excluir contrato. Tente novamente.");
    } finally {
      // Restaura o botão
      if (getElement('#confirm-delete-btn')) {
        getElement('#confirm-delete-btn').disabled = false;
        getElement('#confirm-delete-btn').textContent = 'Excluir';
      }
    }
  },
  
  // Fecha modal de contrato
  closeContractModal() {
    getElement('#contract-modal').classList.add('hidden');
    getElement('#main-add-form').reset();
    state.editingContractId = null;
  },

  // Fecha o modal de exclusão
  closeDeleteModal() {
    getElement('#delete-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
  },
  
  // Inicializa eventos do modal
  initContractModal() {
    const form = getElement('#main-add-form');
    
    // Fechar modal de contrato
    getElement('#close-add-modal-btn').addEventListener('click', () => this.closeContractModal());
    getElement('#cancel-add-modal-btn').addEventListener('click', () => this.closeContractModal());
    
    // Submit do formulário de contrato
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveContract(e.target);
    });
    
    // Botão de excluir - agora abre o modal de confirmação
    getElement('#delete-contract-btn').addEventListener('click', () => {
      this.requestDeleteConfirmation();
    });
    
    // Configura os eventos do modal de confirmação
    getElement('#confirm-delete-btn').addEventListener('click', () => {
      this.confirmDeleteContract();
    });
    
    getElement('#cancel-delete-btn').addEventListener('click', () => {
      this.closeDeleteModal();
    });

    // Estilização dos checkboxes de dias
    document.querySelectorAll('.weekday-checkbox').forEach(checkbox => {
      const label = checkbox.nextElementSibling;
      checkbox.addEventListener('change', () => {
        label.classList.toggle('border-emerald-500', checkbox.checked);
        label.classList.toggle('bg-emerald-500/10', checkbox.checked);
      });
    });
  }
};

// =============================================
// Módulo de Agenda
// =============================================
const agendaModule = {
  monthNames: [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", 
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ],
  
  dayMap: { 
    'Dom': 0, 'Seg': 1, 'Ter': 2, 'Qua': 3, 
    'Qui': 4, 'Sex': 5, 'Sab': 6 
  },
  
  selectedDayElement: null,
  
  // Renderiza o calendário
  renderCalendar() {
    const monthYearEl = getElement('#month-year');
    const calendarGridEl = getElement('#calendar-grid');
    
    const year = state.calendarDate.getFullYear();
    const month = state.calendarDate.getMonth();
    
    monthYearEl.textContent = `${this.monthNames[month]} ${year}`;
    
    // Cabeçalho dos dias da semana
    let daysHtml = Object.keys(this.dayMap)
      .map(d => `<div class="text-center text-xs text-gray-400 font-bold py-2">${d.toUpperCase()}</div>`)
      .join('');
    
    // Dias vazios no início do mês
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    for (let i = 0; i < firstDayOfMonth; i++) { 
      daysHtml += `<div></div>`; 
    }
    
    // Dias do mês
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const date = new Date(year, month, day);
      const dayOfWeek = date.getDay();
      
      // Verifica se há compromissos neste dia
      const hasAppointment = state.contracts.some(contract => 
        (contract.weekdays || []).some(weekday => 
          this.dayMap[weekday] === dayOfWeek
        )
      );
      
      // Estilização do dia
      let dayClass = 'text-center py-2 rounded-lg cursor-pointer hover:bg-gray-700 relative transition-colors duration-200';
      
      // Destaca o dia atual
      if (new Date().toDateString() === date.toDateString()) {
        dayClass += ' border border-emerald-500';
      }
      
      // Adiciona marcador se houver compromisso
      const marker = hasAppointment 
        ? '<div class="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>' 
        : '';
      
      daysHtml += `
        <div class="${dayClass}" data-date="${dateStr}">
          ${day}
          ${marker}
        </div>
      `;
    }
    
    calendarGridEl.innerHTML = daysHtml;
    this.selectedDayElement = null;
    getElement('#appointments-list').innerHTML = '<p class="text-gray-400 py-4">Selecione um dia para ver os compromissos.</p>';
  },
  
  // Mostra compromissos de uma data específica
  showAppointments(dateStr) {
    const date = new Date(dateStr + 'T12:00:00');
    const dayOfWeek = date.getDay();
    
    // Filtra contratos que têm aula neste dia da semana
    const appointments = state.contracts
      .filter(contract => 
        (contract.weekdays || []).some(weekday => 
          this.dayMap[weekday] === dayOfWeek
        )
      )
      .sort((a, b) => a.classTime.localeCompare(b.classTime));
    
    // Atualiza título
    getElement('#appointments-title').textContent = 
      `Compromissos - ${date.toLocaleDateString('pt-BR', {day: '2-digit', month: 'long'})}`;
    
    // Renderiza lista
    const listEl = getElement('#appointments-list');
    
    if (appointments.length === 0) {
      listEl.innerHTML = '<p class="text-gray-400">Nenhum compromisso para este dia.</p>';
    } else {
      listEl.innerHTML = appointments.map(app => `
        <div class="bg-gray-800 p-3 rounded-lg flex items-center">
          <div class="w-16 text-emerald-400 font-bold">${app.classTime}</div>
          <div class="border-l-2 border-emerald-500 pl-3 ml-3">
            <p class="text-white font-semibold">${app.studentName}</p>
            <p class="text-sm text-gray-400">${app.locationName}</p>
          </div>
        </div>
      `).join('');
    }
  },
  
  // Inicializa eventos da agenda
  init() {
    // Navegação do calendário
    getElement('#prev-month-btn').addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() - 1);
      this.renderCalendar();
    });
    
    getElement('#next-month-btn').addEventListener('click', () => {
      state.calendarDate.setMonth(state.calendarDate.getMonth() + 1);
      this.renderCalendar();
    });
    
    // Seleção de dia
    getElement('#calendar-grid').addEventListener('click', (e) => {
      const dayEl = e.target.closest('[data-date]');
      if (!dayEl) return;
      
      // Remove seleção anterior
      if (this.selectedDayElement) {
        this.selectedDayElement.classList.remove('bg-emerald-600', 'text-white');
        this.selectedDayElement.classList.add('hover:bg-gray-700');
      }
      
      // Adiciona seleção nova
      dayEl.classList.add('bg-emerald-600', 'text-white');
      dayEl.classList.remove('hover:bg-gray-700');
      this.selectedDayElement = dayEl;
      
      // Mostra compromissos
      this.showAppointments(dayEl.dataset.date);
    });
    
    // Renderiza calendário inicial
    this.renderCalendar();
  }
};

// =============================================
// Módulo de Dados
// =============================================
const dataModule = {
  // Configura listeners para dados em tempo real
  setupDataListeners(userId) {
    if (state.contractsListener) {
      state.contractsListener();
    }
    
    const { collection, query, onSnapshot } = window.firebase;
    const path = `artifacts/${appId}/users/${userId}/contracts`;
    const q = query(collection(db, path));
    
    state.contractsListener = onSnapshot(q, (snapshot) => {
      state.contracts = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      
      console.log("Contratos atualizados:", state.contracts.length);
      
      if (state.currentPage === 'dashboard-page') {
        dashboardModule.updateDashboard();
      } else if (state.currentPage === 'agenda-page') {
        agendaModule.renderCalendar();
        if (agendaModule.selectedDayElement) {
          agendaModule.showAppointments(agendaModule.selectedDayElement.dataset.date);
        }
      } else if (state.currentPage === 'contracts-page') {
        this.renderContractsTable();
      }
    }, (error) => {
      console.error("Erro ao receber contratos:", error);
    });
  },
  
  // Renderiza tabela de contratos
  renderContractsTable() {
    const tbody = getElement('#contracts-tbody');
    const totalCell = getElement('#total-cell span');
    
    const searchTerm = (getElement('#search-contracts').value || '').toLowerCase();
    const filteredContracts = state.contracts.filter(c => 
      (c.studentName || '').toLowerCase().includes(searchTerm) ||
      (c.locationName || '').toLowerCase().includes(searchTerm)
    );
    
    tbody.innerHTML = '';
    
    const total = filteredContracts.reduce((sum, c) => sum + c.monthlyValue, 0);
    totalCell.textContent = formatCurrency(total);
    
    if (filteredContracts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="px-6 py-4 text-center text-gray-400">Nenhum contrato encontrado.</td></tr>`;
        return;
    }

    filteredContracts.forEach(c => {
      const row = tbody.insertRow();
      row.className = 'bg-gray-800 border-b border-gray-700';
      row.innerHTML = `
        <th class="px-6 py-4 font-medium text-white">${c.studentName}</th>
        <td class="px-6 py-4">${c.locationName}</td>
        <td class="px-6 py-4">${(c.weekdays || []).join(', ')}</td>
        <td class="px-6 py-4 value-cell">
          <span>${formatCurrency(c.monthlyValue)}</span>
        </td>
        <td class="px-6 py-4 text-right">
          <button data-id="${c.id}" class="edit-btn p-2 rounded-full hover:bg-gray-600" title="Editar Contrato">
            <svg class="w-5 h-5 text-blue-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
          </button>
        </td>
      `;
    });
  },
  
  // Inicializa eventos da tabela
  initContractsTable() {
    getElement('#search-contracts').addEventListener('input', () => {
      this.renderContractsTable();
    });
    
    getElement('#toggle-values-btn').addEventListener('click', () => {
      const table = getElement('#contracts-table');
      const isHidden = table.classList.toggle('values-hidden');
      
      document.getElementById('icon-show').classList.toggle('hidden', isHidden);
      document.getElementById('icon-hide').classList.toggle('hidden', !isHidden);
    });
    
    getElement('#contracts-tbody').addEventListener('click', (e) => {
      const editBtn = e.target.closest('.edit-btn');
      if (editBtn) {
        contractModule.showContractModal(editBtn.dataset.id);
      }
    });
  }
};

// =============================================
// Módulo de Interface (UI)
// =============================================
const uiModule = {
  isLogin: true,

  // Inicializa a interface do usuário
  init() {
    this.renderLandingPage();
    this.renderAuthModal();
    this.renderContractModal();
    this.renderDeleteModal();

    // Inicializa módulos
    navigationModule.init();
    contractModule.initContractModal();
    agendaModule.init();
    dataModule.initContractsTable();
    authModule.setupAuthListener();
  },
  
  // Renderiza a landing page
  renderLandingPage() {
    const landingContainer = getElement('#landing-container');
    landingContainer.innerHTML = `
      <header class="bg-black/80 backdrop-blur-sm sticky top-0 z-40">
        <nav class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div class="flex items-center justify-between h-20">
            <div class="flex items-center">
              <span class="font-bold text-3xl text-white">
                Wallet.<span class="text-emerald-400">a</span>
              </span>
            </div>
            <div class="flex items-center space-x-2">
              <button id="login-btn" class="text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
                Login
              </button>
              <button id="signup-btn" class="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-emerald-700">
                Cadastre-se
              </button>
            </div>
          </div>
        </nav>
      </header>
      <main>
        <div class="max-w-7xl mx-auto pt-16 pb-24 px-4 sm:px-6 lg:px-8 text-center">
          <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight">
            <span class="block">Gestão financeira e de tempo</span>
            <span class="block text-emerald-400">para autônomos.</span>
          </h1>
          <p class="mt-6 max-w-lg mx-auto text-lg text-gray-400">
            Automatize cobranças, organize sua agenda e veja sua receita crescer.
          </p>
          <div class="mt-10">
            <button id="main-signup-btn" class="px-8 py-3 border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-emerald-600 hover:bg-emerald-700">
              Começar agora
            </button>
          </div>
        </div>
      </main>
    `;
    
    getElement('#login-btn').addEventListener('click', () => this.showAuthModal('login'));
    getElement('#signup-btn').addEventListener('click', () => this.showAuthModal('signup'));
    getElement('#main-signup-btn').addEventListener('click', () => this.showAuthModal('signup'));
  },
  
  // Renderiza o modal de autenticação
  renderAuthModal() {
    const authModalContainer = getElement('#auth-modal-container');
    authModalContainer.innerHTML = `
      <div id="auth-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
          <form id="auth-form">
            <div class="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 id="modal-title" class="text-2xl font-bold"></h2>
              <button type="button" id="close-auth-modal-btn" class="text-gray-400 text-2xl hover:text-white">
                &times;
              </button>
            </div>
            <div class="p-8 space-y-6">
              <button type="button" id="google-signin-btn" class="w-full flex items-center justify-center py-3 px-4 border border-gray-600 rounded-lg bg-gray-700 hover:bg-gray-600">
                Continuar com o Google
              </button>
              <div class="relative">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-gray-600"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-2 bg-gray-800 text-gray-400">OU</span>
                </div>
              </div>
              <div>
                <label for="email" class="block mb-2 text-sm">Email</label>
                <input id="email" type="email" class="w-full bg-gray-700 rounded-lg p-2.5" required>
              </div>
              <div>
                <label for="password" class="block mb-2 text-sm">Senha</label>
                <input id="password" type="password" class="w-full bg-gray-700 rounded-lg p-2.5" required>
              </div>
              <p id="auth-error" class="text-sm text-red-400 text-center h-4"></p>
            </div>
            <div class="px-8 pb-8">
              <button type="submit" id="submit-btn" class="w-full px-5 py-3 text-sm font-medium text-white bg-emerald-600 rounded-lg flex items-center justify-center">
                <span id="submit-btn-text"></span>
                <div id="submit-spinner" class="spinner hidden"></div>
              </button>
              <p class="mt-4 text-center text-sm">
                <span id="prompt-text"></span> 
                <button type="button" id="toggle-form" class="font-medium text-emerald-400 hover:underline"></button>
              </p>
            </div>
          </form>
        </div>
      </div>
    `;
    
    this.setupAuthModalEvents();
  },
  
  // Configura eventos do modal de autenticação
  setupAuthModalEvents() {
    const authModal = getElement('#auth-modal');
    
    getElement('#close-auth-modal-btn').addEventListener('click', () => {
      authModal.classList.add('hidden');
    });
    
    getElement('#toggle-form').addEventListener('click', () => {
      this.showAuthModal(this.isLogin ? 'signup' : 'login');
    });
    
    getElement('#google-signin-btn').addEventListener('click', () => {
      authModule.loginWithGoogle();
    });
    
    getElement('#auth-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = getElement('#email').value;
      const password = getElement('#password').value;
      if (this.isLogin) {
        await authModule.loginWithEmail(email, password);
      } else {
        await authModule.signupWithEmail(email, password);
      }
    });
  },
  
  // Mostra modal de autenticação
  showAuthModal(type = 'login') {
    const authModal = getElement('#auth-modal');
    this.isLogin = type === 'login';
    
    getElement('#modal-title').textContent = this.isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta';
    getElement('#submit-btn-text').textContent = this.isLogin ? 'Login' : 'Criar conta';
    getElement('#prompt-text').textContent = this.isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?';
    getElement('#toggle-form').textContent = this.isLogin ? 'Cadastre-se' : 'Login';
    
    getElement('#auth-error').textContent = '';
    getElement('#auth-form').reset();
    
    authModal.classList.remove('hidden');
  },
  
  // Renderiza modal de contrato
  renderContractModal() {
    const contractModalContainer = getElement('#contract-modal-container');
    contractModalContainer.innerHTML = `
      <div id="contract-modal" class="hidden fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md border border-gray-700">
          <form id="main-add-form" novalidate>
            <div class="flex justify-between items-center p-6 border-b border-gray-700">
              <h2 id="contract-modal-title" class="text-2xl font-bold text-white"></h2>
              <button type="button" id="close-add-modal-btn" class="text-gray-400 text-2xl hover:text-white">
                &times;
              </button>
            </div>
            <div class="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
              <div>
                <label class="block mb-2 text-sm">Nome do Aluno</label>
                <input name="studentName" type="text" class="w-full bg-gray-700 rounded-lg p-2.5" required>
              </div>
              <div>
                <label class="block mb-2 text-sm">Condomínio / Local</label>
                <input name="locationName" type="text" class="w-full bg-gray-700 rounded-lg p-2.5">
              </div>
              <div>
                <label class="block mb-2 text-sm">Dias de Aula</label>
                <div class="grid grid-cols-4 gap-2 text-center">
                  ${['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'].map(day => `
                  <div>
                    <input type="checkbox" name="weekday" value="${day}" id="day-${day.toLowerCase()}" class="hidden weekday-checkbox">
                    <label for="day-${day.toLowerCase()}" class="block border-2 border-gray-600 rounded-lg p-2 cursor-pointer text-sm">${day.toUpperCase()}</label>
                  </div>
                  `).join('')}
                </div>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="block mb-2 text-sm">Horário</label>
                  <input name="classTime" type="time" class="w-full bg-gray-700 rounded-lg p-2.5" required>
                </div>
                <div>
                  <label class="block mb-2 text-sm">Valor Mensal</label>
                  <input name="monthlyValue" type="number" step="0.01" class="w-full bg-gray-700 rounded-lg p-2.5" required>
                </div>
              </div>
              <div>
                <label class="block mb-2 text-sm">Dia do Vencimento</label>
                <input name="dueDay" type="number" min="1" max="31" class="w-full bg-gray-700 rounded-lg p-2.5" required>
              </div>
            </div>
            <div class="flex items-center justify-between p-6 border-t border-gray-700">
              <button type="button" id="delete-contract-btn" class="hidden px-5 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg">
                Excluir Contrato
              </button>
              <div class="flex-grow flex justify-end">
                <button type="button" id="cancel-add-modal-btn" class="px-5 py-2.5 text-sm text-gray-300 bg-gray-700 rounded-lg">
                  Cancelar
                </button>
                <button type="submit" id="contract-submit-btn" class="px-5 py-2.5 text-sm text-white bg-emerald-600 rounded-lg ml-3">
                  Salvar
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    `;
  },

  // Renderiza modal de exclusão
  renderDeleteModal() {
    const deleteModalContainer = getElement('#delete-modal-container');
    deleteModalContainer.innerHTML = `
      <div id="delete-modal" class="hidden fixed inset-0 bg-black bg-opacity-80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div class="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-700 p-8 text-center">
            <h2 class="text-2xl font-bold text-white mb-4">Confirmar Exclusão</h2>
            <p class="text-gray-400 mb-8">Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.</p>
            <div class="flex justify-center gap-4">
                <button id="cancel-delete-btn" class="px-8 py-2.5 text-sm text-gray-300 bg-gray-700 rounded-lg hover:bg-gray-600">Cancelar</button>
                <button id="confirm-delete-btn" class="px-8 py-2.5 text-sm text-white bg-red-600 rounded-lg hover:bg-red-700">Excluir</button>
            </div>
        </div>
      </div>
    `;
  }
};

// =============================================
// Inicialização da Aplicação
// =============================================
document.addEventListener('DOMContentLoaded', () => {
  try {
    if (window.firebase) {
      uiModule.init();
      console.log("Aplicação inicializada com sucesso");
    } else {
        throw new Error("SDK do Firebase não carregado.");
    }
  } catch (error) {
    console.error("Erro na inicialização:", error);
    showFatalError("Erro ao carregar o aplicativo. Recarregue a página.");
  }
});