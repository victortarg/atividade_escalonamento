// scheduler.js - Lógica Final com FCFS, RR e WPS

// --- Classes e Funções de Cálculo ---

class Processo {
  constructor(id, chegada, pico, prioridade) {
    this.id = id;
    this.chegada = chegada;
    this.pico = pico;
    this.pico_restante = pico;
    this.prioridade = prioridade; // Prioridade dinâmica
    this.prioridade_original = prioridade;
    this.conclusao = 0;
    this.turnaround = 0;
    this.espera = 0;
  }
}

function calcularMetricas(processos) {
  let TME = 0;
  let TMT = 0;
  for (const p of processos) {
    p.turnaround = p.conclusao - p.chegada;
    p.espera = p.turnaround - p.pico;

    TMT += p.turnaround;
    TME += p.espera;
  }

  const TMT_medio = TMT / processos.length;
  const TME_medio = TME / processos.length;

  return { processos, TMT_medio, TME_medio };
}

// -------------------------------- FCFS ---------------------------------
function escalonarFCFS(dadosProcessos) {
  // FCFS não usa a prioridade, então passamos 0
  let processos = dadosProcessos.map(
    (p) => new Processo(p.id, p.chegada, p.pico, 0)
  );
  processos.sort((a, b) => a.chegada - b.chegada);

  let tempoAtual = 0;
  const gantt = [];

  for (const p of processos) {
    const tempoInicio = Math.max(tempoAtual, p.chegada);
    const tempoConclusao = tempoInicio + p.pico;

    p.conclusao = tempoConclusao;
    tempoAtual = tempoConclusao;

    gantt.push({ id: p.id, inicio: tempoInicio, fim: tempoConclusao });
  }

  return { ...calcularMetricas(processos), gantt };
}

// ------------------------------ ROUND ROBIN ------------------------------
function escalonarRR(dadosProcessos, quantum) {
  // RR não usa a prioridade, então passamos 0
  const processosOriginais = dadosProcessos.map(
    (p) => new Processo(p.id, p.chegada, p.pico, 0)
  );
  const processosAtuais = [...processosOriginais].sort(
    (a, b) => a.chegada - b.chegada
  );

  let filaProntos = [];
  const processosConcluidos = [];
  const gantt = [];
  let tempoAtual = 0;
  let indiceProcesso = 0;

  while (processosConcluidos.length < processosOriginais.length) {
    while (
      indiceProcesso < processosAtuais.length &&
      processosAtuais[indiceProcesso].chegada <= tempoAtual
    ) {
      filaProntos.push(processosAtuais[indiceProcesso]);
      indiceProcesso++;
    }

    if (filaProntos.length > 0) {
      let p = filaProntos.shift();

      const tempoExecucao = Math.min(quantum, p.pico_restante);

      const tempoInicio = tempoAtual;
      tempoAtual += tempoExecucao;
      p.pico_restante -= tempoExecucao;

      if (tempoExecucao > 0) {
        gantt.push({ id: p.id, inicio: tempoInicio, fim: tempoAtual });
      }

      let processosParaAdicionar = [];
      while (
        indiceProcesso < processosAtuais.length &&
        processosAtuais[indiceProcesso].chegada <= tempoAtual
      ) {
        processosParaAdicionar.push(processosAtuais[indiceProcesso]);
        indiceProcesso++;
      }
      if (processosParaAdicionar.length > 0) {
        filaProntos.push(...processosParaAdicionar);
      }

      if (p.pico_restante === 0) {
        p.conclusao = tempoAtual;
        processosConcluidos.push(p);
      } else {
        filaProntos.push(p);
      }
    } else if (indiceProcesso < processosAtuais.length) {
      tempoAtual = processosAtuais[indiceProcesso].chegada;
    } else {
      break;
    }
  }

  return { ...calcularMetricas(processosConcluidos), gantt };
}

// ------------------------------ WINDOWS PRIORITY SCHEDULER (WPS) ------------------------------

function escalonarWPS(dadosProcessos, quantumNiveis) {
  const processosOriginais = dadosProcessos.map(
    (p) => new Processo(p.id, p.chegada, p.pico, p.prioridade)
  );
  const processosAguardandoChegada = [...processosOriginais].sort(
    (a, b) => a.chegada - b.chegada
  );
  
  // Níveis de Prioridade: Nível 3 (mais alta) ao Nível 1 (mais baixa)
  let filasProntos = {
    3: [],
    2: [], 
    1: [],
  };

  const processosConcluidos = [];
  const gantt = [];
  let tempoAtual = 0;
  let indiceProcesso = 0;

  const quantumMap = {
    3: quantumNiveis[3],
    2: quantumNiveis[2],
    1: quantumNiveis[1],
  };
  const maxPrioridade = 3;

  while (processosConcluidos.length < processosOriginais.length) {
    // Adiciona processos que chegaram
    while (
      indiceProcesso < processosAguardandoChegada.length &&
      processosAguardandoChegada[indiceProcesso].chegada <= tempoAtual
    ) {
      let p = processosAguardandoChegada[indiceProcesso];
      // Garante que a prioridade inicial esteja dentro do limite (1 a 3)
      p.prioridade = Math.min(
        Math.max(p.prioridade_original, 1),
        maxPrioridade
      );
      filasProntos[p.prioridade].push(p);
      indiceProcesso++;
    }

    // Encontra o processo de maior prioridade para rodar
    let processoRodando = null;
    for (let pLevel = maxPrioridade; pLevel >= 1; pLevel--) {
      if (filasProntos[pLevel].length > 0) {
        // RR para desempate: Pega o primeiro da fila
        processoRodando = filasProntos[pLevel].shift();
        break;
      }
    }

    if (processoRodando) {
      const p = processoRodando;
      const currentQuantum = quantumMap[p.prioridade];

      // Simula uma interrupção de E/S aleatória (para simular I/O-bound vs CPU-bound)
      // Se o processo for I/O-bound (executa menos que 50% do quantum), ele tem feedback positivo.
      const burstSimulado =
        Math.random() < 0.3
          ? Math.floor(currentQuantum * 0.4) + 1
          : currentQuantum;

      const tempoExecucao = Math.min(burstSimulado, p.pico_restante);

      const tempoInicio = tempoAtual;
      tempoAtual += tempoExecucao;
      p.pico_restante -= tempoExecucao;

      if (tempoExecucao > 0) {
        gantt.push({ id: p.id, inicio: tempoInicio, fim: tempoAtual });
      }

      // Adiciona NOVOS processos que chegaram durante a execução
      let processosParaAdicionar = [];
      while (
        indiceProcesso < processosAguardandoChegada.length &&
        processosAguardandoChegada[indiceProcesso].chegada <= tempoAtual
      ) {
        let novoP = processosAguardandoChegada[indiceProcesso];
        novoP.prioridade = Math.min(
          Math.max(novoP.prioridade_original, 1),
          maxPrioridade
        );
        processosParaAdicionar.push(novoP);
        indiceProcesso++;
      }

      if (processosParaAdicionar.length > 0) {
        processosParaAdicionar.forEach((np) =>
          filasProntos[np.prioridade].push(np)
        );
      }

      // Feedback e Conclusão
      if (p.pico_restante === 0) {
        p.conclusao = tempoAtual;
        processosConcluidos.push(p);
      } else {
        // Verifica se foi I/O-bound (usou menos que o quantum total, simulação de E/S)
        if (tempoExecucao < currentQuantum) {
          // FEEDBACK POSITIVO (simulação I/O-bound): Tenta subir o nível (máx: 3)
          p.prioridade = Math.min(p.prioridade + 1, maxPrioridade);
        } else {
          // FEEDBACK NEGATIVO (CPU-bound): Desce um nível (mín: 1)
          p.prioridade = Math.max(p.prioridade - 1, 1);
        }

        // Coloca o processo de volta na fila de sua NOVA prioridade
        filasProntos[p.prioridade].push(p);
      }
    } else if (indiceProcesso < processosAguardandoChegada.length) {
      // CPU ociosa, avança o tempo para a chegada do próximo processo
      tempoAtual = processosAguardandoChegada[indiceProcesso].chegada;
    } else {
      break;
    }
  }

  return { ...calcularMetricas(processosConcluidos), gantt };
}

// --- Funções Auxiliares e Principal de Execução ---

function parseInput() {
  const input = document.getElementById("process-input").value;
  const lines = input.split("\n").filter((line) => line.trim() !== "");
  const data = [];
  for (const line of lines) {
    // Agora esperamos 4 valores: ID, Chegada, Pico, Prioridade
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length === 4) {
      data.push({
        id: parts[0],
        chegada: parseInt(parts[1]),
        pico: parseInt(parts[2]),
        prioridade: parseInt(parts[3]) || 1, // Prioridade default para 1
      });
    } else if (parts.length === 3) {
      // Aceita 3 valores, mas define prioridade como 1
      data.push({
        id: parts[0],
        chegada: parseInt(parts[1]),
        pico: parseInt(parts[2]),
        prioridade: 1,
      });
    }
  }
  return data;
}

function renderizarTabela(elementId, processos) {
  const table = document.getElementById(elementId);
  let extraHeader = "";
  if (elementId === "wps-tabela") {
    extraHeader = "<th>Prioridade Inicial</th>";
  }

  table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Chegada</th>
                <th>Pico Original</th>
                ${extraHeader}
                <th>Conclusão</th>
                <th>Turnaround</th>
                <th>Espera</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
  const tbody = table.querySelector("tbody");
  for (const p of processos) {
    const row = tbody.insertRow();
    row.insertCell().textContent = p.id;
    row.insertCell().textContent = p.chegada;
    row.insertCell().textContent = p.pico;
    if (elementId === "wps-tabela") {
      row.insertCell().textContent = p.prioridade_original;
    }
    row.insertCell().textContent = p.conclusao;
    row.insertCell().textContent = p.turnaround;
    row.insertCell().textContent = p.espera;
  }
}

function renderizarMetricas(elementId, tmt, tme) {
  const div = document.getElementById(elementId);
  div.innerHTML = `
        <div>TMT Médio: <strong>${tmt.toFixed(2)}</strong></div>
        <div>TME Médio: <strong>${tme.toFixed(2)}</strong></div>
    `;
}

function renderizarGantt(elementId, gantt) {
  const container = document.getElementById(elementId);
  container.innerHTML = "";
  const wrapper = container.parentElement;
  wrapper.querySelectorAll(".time-marker-container").forEach((e) => e.remove());

  if (gantt.length === 0) return;

  const tempoMaximo = gantt[gantt.length - 1].fim;

  const escala = 30;
  const larguraTotal = tempoMaximo * escala;
  container.style.width = `${Math.max(
    larguraTotal,
    wrapper.clientWidth - 30
  )}px`;

  const timeMarkerContainer = document.createElement("div");
  timeMarkerContainer.className = "time-marker-container";

  for (const segmento of gantt) {
    const duracao = segmento.fim - segmento.inicio;
    const largura = duracao * escala;
    const offset = segmento.inicio * escala;

    const segmentDiv = document.createElement("div");
    segmentDiv.className = `gantt-segment process-${segmento.id}`;
    segmentDiv.style.left = `${offset}px`;
    segmentDiv.style.width = `${largura}px`;
    segmentDiv.textContent = segmento.id;
    container.appendChild(segmentDiv);

    const line = document.createElement("span");
    line.className = "time-marker-line";
    line.style.left = `${offset}px`;
    timeMarkerContainer.appendChild(line);

    const label = document.createElement("span");
    label.className = "time-marker-label";
    label.style.left = `${offset}px`;
    label.textContent = segmento.inicio;
    timeMarkerContainer.appendChild(label);
  }

  const finalLine = document.createElement("span");
  finalLine.className = "time-marker-line";
  finalLine.style.left = `${larguraTotal}px`;
  timeMarkerContainer.appendChild(finalLine);

  const finalLabel = document.createElement("span");
  finalLabel.className = "time-marker-label";
  finalLabel.style.left = `${larguraTotal}px`;
  finalLabel.textContent = tempoMaximo;
  timeMarkerContainer.appendChild(finalLabel);

  wrapper.appendChild(timeMarkerContainer);
}

function iniciarSimulacao() {
  const dadosProcessos = parseInput();
  const quantumRR = parseInt(document.getElementById("quantum-rr").value);

  const quantumWPS = {
    1: parseInt(document.getElementById("quantum-rr").value), // Nível 1 usa o quantum RR
    2: parseInt(document.getElementById("quantum-p2").value),
    3: parseInt(document.getElementById("quantum-p3").value),
  };

  // 1. Simulação FCFS
  const resultadoFCFS = escalonarFCFS(dadosProcessos);
  renderizarTabela("fcfs-tabela", resultadoFCFS.processos);
  renderizarMetricas(
    "fcfs-metricas",
    resultadoFCFS.TMT_medio,
    resultadoFCFS.TME_medio
  );
  renderizarGantt("gantt-fcfs", resultadoFCFS.gantt);

  // 2. Simulação Round Robin
  document.getElementById("rr-quantum").textContent = quantumRR;
  const resultadoRR = escalonarRR(dadosProcessos, quantumRR);
  renderizarTabela("rr-tabela", resultadoRR.processos);
  renderizarMetricas(
    "rr-metricas",
    resultadoRR.TMT_medio,
    resultadoRR.TME_medio
  );
  renderizarGantt("gantt-rr", resultadoRR.gantt);

  // 3. Simulação WPS
  document.getElementById(
    "wps-titulo"
  ).innerHTML = `3. Windows Priority Scheduler (WPS) - Q1: ${quantumWPS[1]}, Q2: ${quantumWPS[2]}, Q3: ${quantumWPS[3]}`;
  const resultadoWPS = escalonarWPS(dadosProcessos, quantumWPS);
  renderizarTabela("wps-tabela", resultadoWPS.processos);
  renderizarMetricas(
    "wps-metricas",
    resultadoWPS.TMT_medio,
    resultadoWPS.TME_medio
  );
  renderizarGantt("gantt-wps", resultadoWPS.gantt);
}

// Inicializa a simulação ao carregar a página
document.addEventListener("DOMContentLoaded", iniciarSimulacao);
