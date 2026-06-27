import Chart from "chart.js/auto";

type BetDistributionEntry = {
    bet: string;
    count: number;
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
                    label: "Bets",
                    data: distribution.map((entry) => entry.count),
                    backgroundColor: distribution.map(function (_, index) {
                        return `hsl(${(index * 360.0) / distribution.length}, 70%, 55%)`;
                    }),
                    borderWidth: 1,
                },
            ],
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0,
                    },
                },
            },
            plugins: {
                legend: {
                    display: false,
                },
                tooltip: {
                    callbacks: {
                        label: function (context) {
                            const value = context.raw;
                            return `${context.label}: ${value}x`;
                        },
                    },
                },
            },
        },
    });
});
