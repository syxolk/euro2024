import Chart from "chart.js/auto";

type BetDistributionEntry = {
    bet: string;
    count: number;
    goalDifference: number;
};

function getBarColor(goalDifference: number, maxGoalDifference: number) {
    if (maxGoalDifference <= 0) {
        return "hsl(50, 85%, 55%)";
    }

    const minHue = 50;
    const maxHue = 220;
    const hue =
        minHue + (goalDifference / maxGoalDifference) * (maxHue - minHue);

    return `hsl(${hue}, 75%, 55%)`;
}

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

    const maxGoalDifference = Math.max(
        ...distribution.map((entry) => entry.goalDifference)
    );

    new Chart(canvas, {
        type: "bar",
        data: {
            labels: distribution.map((entry) => entry.bet),
            datasets: [
                {
                    label: "Bets",
                    data: distribution.map((entry) => entry.count),
                    backgroundColor: distribution.map(function (entry) {
                        return getBarColor(
                            entry.goalDifference,
                            maxGoalDifference
                        );
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
                            return `${value}x`;
                        },
                    },
                },
            },
        },
    });
});
