import "bootstrap";

// @ts-expect-error -- Side-effect CSS import resolved by bundler
import "bootstrap/dist/css/bootstrap.min.css";

// @ts-expect-error -- Side-effect CSS import resolved by bundler
import "datatables.net-bs5/css/dataTables.bootstrap5.min.css";

import "./extra_bet";
import "./friend";
import "./friend_history";
import "./past_confetti";
import "./save_bets";
import "./settings";
import "./theme";
