import Chart from "chart.js/auto";
import DataTable from "datatables.net-bs5";

type FriendHistoryResponse = {
    ok: boolean;
    labels: string[];
    data: Array<{
        name: string;
        scores: number[];
    }>;
};

function integrateScores(scores: number[]) {
    let currentSum = 0;

    return scores.map(function (score) {
        currentSum += score;
        return currentSum;
    });
}

const LINE_WIDTH = 2;
const ACTIVE_LINE_WIDTH = 4;

function renderChart(canvas: HTMLCanvasElement, result: FriendHistoryResponse) {
    new Chart(canvas, {
        type: "line",
        data: {
            labels: result.labels,
            datasets: result.data.map(function (
                user: FriendHistoryResponse["data"][number],
                index: number
            ) {
                const color = `hsl(${(index * 360.0) / result.data.length},100%,50%)`;

                return {
                    backgroundColor: color,
                    borderColor: color,
                    data: integrateScores(user.scores),
                    fill: false,
                    label: user.name,
                    tension: 0,
                    borderWidth: LINE_WIDTH,
                };
            }),
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                },
            },
            onHover(event, elements, chart) {
                chart.data.datasets.forEach((dataset, i) => {
                    const active =
                        elements.length && elements[0].datasetIndex === i;

                    dataset.borderWidth = active
                        ? ACTIVE_LINE_WIDTH
                        : LINE_WIDTH;
                    dataset.order = active ? 0 : 1;
                });

                chart.update("none");
            },
        },
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const canvas = document.getElementById("friend-history");

    if (canvas instanceof HTMLCanvasElement) {
        void fetch("/friend_history")
            .then(function (response) {
                return response.json() as Promise<FriendHistoryResponse>;
            })
            .then(function (result) {
                if (!result.ok) {
                    console.error(result);
                    return;
                }

                renderChart(canvas, result);
            });
    }

    const highscoreTable = document.getElementById("highscore");

    if (!(highscoreTable instanceof HTMLTableElement)) {
        return;
    }

    new DataTable(highscoreTable, {
        paging: false,
        order: [
            [0, "asc"],
            [2, "asc"],
        ],
        columnDefs: [
            { searchable: true, targets: 2 },
            { searchable: false, targets: "_all" },
            { orderSequence: ["asc", "desc"], targets: [0, 2] },
            { orderSequence: ["desc", "asc"], targets: "_all" },
            { orderData: [0, 2], targets: 0 },
            { orderData: [3, 0, 2], targets: 3 },
        ],
    });
});
