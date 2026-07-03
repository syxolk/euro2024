import Chart from "chart.js/auto";

type BetDistributionEntry = {
    bet: string;
    correct: number;
    diff: number;
    winner: number;
    wrong: number;
};

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("user-bets-chart");

    if (!(canvas instanceof HTMLCanvasElement)) {
        return;
    }

    const rawData = canvas.dataset.labels;
    if (!rawData) {
        return;
    }

    const distribution = JSON.parse(rawData) as BetDistributionEntry[];

    if (distribution.length === 0) {
        return;
    }

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: distribution.map((entry) => entry.bet),
            datasets: [
                {
                    label: "Correct Bet",
                    data: distribution.map((entry) => entry.correct),
                    backgroundColor: "#08213a",
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: "Correct Diff",
                    data: distribution.map((entry) => entry.diff),
                    backgroundColor: "#595690",
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: "Correct Winner/Draw",
                    data: distribution.map((entry) => entry.winner),
                    backgroundColor: "#5baabb",
                    borderWidth: 1,
                    stack: "bets",
                },
                {
                    label: "Wrong",
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
                            return `${context.dataset.label}: ${value}x`;
                        },
                    },
                },
            },
        },
    });
});
