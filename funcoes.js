class Processo {
  constructor(id, chegada, pico) {
    this.id = id;
    this.chegada = chegada;
    this.pico = pico;
    this.pico_restante = pico;
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
  let processos = dadosProcessos.map(
    (p) => new Processo(p.id, p.chegada, p.pico)
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
  const processosOriginais = dadosProcessos.map(
    (p) => new Processo(p.id, p.chegada, p.pico)
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
    // Adiciona processos que chegaram
    while (indiceProcesso < processosAtuais.length && processosAtuais[indiceProcesso].chegada <= tempoAtual) {
      filaProntos.push(processosAtuais[indiceProcesso]);
      indiceProcesso++;
    }

    if (filaProntos.length > 0) {
      let p = filaProntos.shift();

      const tempoExecucao = Math.min(quantum, p.pico_restante);

      const tempoInicio = tempoAtual;
      tempoAtual += tempoExecucao;
      p.pico_restante -= tempoExecucao;

      // Se o processo rodou por tempoExecucao > 0, registra no Gantt
      if (tempoExecucao > 0) {
        gantt.push({ id: p.id, inicio: tempoInicio, fim: tempoAtual });
      }

      // Adiciona NOVOS processos que chegaram DURANTE a execução
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

      // Verifica se o processo terminou
      if (p.pico_restante === 0) {
        p.conclusao = tempoAtual;
        processosConcluidos.push(p);
      } else {
        // Coloca o processo de volta no final da fila (após os novos chegados)
        filaProntos.push(p);
      }
    } else if (indiceProcesso < processosAtuais.length) {
      // CPU ociosa, avança o tempo para a chegada do próximo processo
      tempoAtual = processosAtuais[indiceProcesso].chegada;
    } else {
      // Todos os processos concluídos e não há mais a chegar
      break;
    }
  }

  return { ...calcularMetricas(processosConcluidos), gantt };
}

// --- Funções de Renderização HTML ---

function renderizarTabela(elementId, processos) {
  const table = document.getElementById(elementId);
  table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Chegada</th>
                <th>Pico Original</th>
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
  // Limpa o conteúdo anterior e os marcadores de tempo
  container.innerHTML = "";
  const wrapper = container.parentElement;
  wrapper.querySelectorAll(".time-marker-container").forEach((e) => e.remove());

  if (gantt.length === 0) return;

  const tempoMaximo = gantt[gantt.length - 1].fim;

  // Configura a escala e largura total do gráfico
  const escala = 30; // Pixels por unidade de tempo
  const larguraTotal = tempoMaximo * escala;
  container.style.width = `${Math.max(
    larguraTotal,
    wrapper.clientWidth - 30
  )}px`; // Garante largura mínima/alinhamento

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

    // Adiciona marcas de tempo 
    const line = document.createElement("span");
    line.className = "time-marker-line";
    line.style.left = `${offset}px`;
    timeMarkerContainer.appendChild(line);

    // Label de tempo
    const label = document.createElement("span");
    label.className = "time-marker-label";
    label.style.left = `${offset}px`;
    label.textContent = segmento.inicio;
    timeMarkerContainer.appendChild(label);
  }

  // Marcação final
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

// --- Funções Auxiliares e Principal de Execução ---

function parseInput() {
  const input = document.getElementById("process-input").value;
  const lines = input.split("\n").filter((line) => line.trim() !== "");
  const data = [];
  for (const line of lines) {
    const parts = line.split(",").map((s) => s.trim());
    if (parts.length === 3) {
      data.push({
        id: parts[0],
        chegada: parseInt(parts[1]),
        pico: parseInt(parts[2]),
      });
    }
  }
  return data;
}

function iniciarSimulacao() {
  const dadosProcessos = parseInput();
  const quantum = parseInt(document.getElementById("quantum-input").value);

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
  document.getElementById("rr-quantum").textContent = quantum;
  const resultadoRR = escalonarRR(dadosProcessos, quantum);
  renderizarTabela("rr-tabela", resultadoRR.processos);
  renderizarMetricas(
    "rr-metricas",
    resultadoRR.TMT_medio,
    resultadoRR.TME_medio
  );
  renderizarGantt("gantt-rr", resultadoRR.gantt);
}

// Inicializa a simulação ao carregar a página
document.addEventListener("DOMContentLoaded", iniciarSimulacao);