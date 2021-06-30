$(function() {
    function integrateScores(scores) {
        var currSum = 0;
        return scores.map(function(x) {
            currSum += x;
            return currSum;
        });
    }

    // check if there is a friend history canvas (only on friends highscore)
    if($('#friend-history').length === 0) {
        return;
    }

    $.get('/friend_history').done(function(result) {
        if(! result.ok) {
            console.error(result);
            return;
        }

        new Chart($('#friend-history'), {
            type: 'line',
            data: {
                labels: result.labels,
                datasets: result.data.map(function(user, index) {
                    var color = 'hsl(' + (index * 360.0 / result.data.length) + ',100%,50%)';

                    return {
                        label: user.name,
                        lineTension: 0,
                        borderColor: color,
                        backgroundColor: color,
                        fill: false,
                        data: integrateScores(user.scores)
                    };
                })
            },
            options: {
                scales: {
                    y: {
                        ticks: {
                            min: 0
                        }
                    }
                }
            }
        });
    });
});

$(function () {
    $('#highscore').DataTable({
        paging: false,
        order: [[0, 'asc'], [2, 'asc']],
        columnDefs: [
            // Allow search only for the name column
            {searchable: true, targets: 2},
            {searchable: false, targets: '_all'},
            // Fix default order direction (except name and rank)
            {orderSequence: ["asc", "desc"], targets: [0, 2]},
            {orderSequence: ["desc", "asc"], targets: '_all'},
            // Order by rank and name
            {orderData: [0, 2], targets: 0},
            {orderData: [3, 0, 2], targets: 3},
        ],
    });
});
