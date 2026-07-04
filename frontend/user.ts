import Chart from "chart.js/auto";

type BetDistributionEntry = {
    bet: string;
    correct: number;
    diff: number;
    winner: number;
    wrong: number;
};

type BetDistributionLabels = {
    correct: string;
    diff: string;
    winner: string;
    wrong: string;
    countSuffix: string;
};

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("user-bets-chart");

    if (!(canvas instanceof HTMLCanvasElement)) {
        return;
    }

    const rawData = canvas.dataset.labels;
    const rawDatasetLabels = canvas.dataset.datasetLabels;
    if (!rawData || !rawDatasetLabels) {
        return;
    }

    const distribution = JSON.parse(rawData) as BetDistributionEntry[];
    const datasetLabels = JSON.parse(rawDatasetLabels) as BetDistributionLabels;

    if (distribution.length === 0) {
        return;
    }

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: distribution.map((entry) => entry.bet),
            datasets: [
                {
                    label: datasetLabels.correct,
                    data: distribution.map((entry) => entry.correct),
                    backgroundColor: "#08213a",
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: datasetLabels.diff,
                    data: distribution.map((entry) => entry.diff),
                    backgroundColor: "#595690",
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: datasetLabels.winner,
                    data: distribution.map((entry) => entry.winner),
                    backgroundColor: "#5baabb",
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: datasetLabels.wrong,
                    data: distribution.map((entry) => entry.wrong),
                    backgroundColor: "#eeeeee",
                    borderWidth: 1,
                    stack: "bets",
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                x: {
                    stacked: true,
                },
                y: {
                    stacked: true,
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
            plugins: {
                legend: {
                    display: true,
                    position: "bottom",
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            return `${context.dataset.label}: ${value}${datasetLabels.countSuffix}`;
                        },
                    },
                },
            },
        },
    });
});
