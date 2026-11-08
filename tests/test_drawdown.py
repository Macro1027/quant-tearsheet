from api.schemas import DrawdownEpisode
from quant.drawdown import average_drawdown, calmar, episodes, max_drawdown, ulcer_index, underwater
from tests.support import assert_series, close, on

GROWTH = on(
    ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04", "2020-01-05", "2020-01-06"],
    [1, 2, 1, 1.5, 2, 1],
)
PATH = on(
    ["2020-01-01", "2020-01-02", "2020-01-03", "2020-01-04", "2020-01-05", "2020-01-06"],
    [0, 0, -0.5, -0.25, 0, -0.5],
)


def test_underwater_is_zero_at_a_peak_and_negative_below_it():
    assert_series(underwater(GROWTH), PATH)


def test_max_drawdown_is_the_most_negative_depth():
    assert max_drawdown(PATH) == close(-0.5)


def test_average_drawdown_is_the_mean_of_the_episode_depths():
    assert average_drawdown(PATH) == close(-0.5)


def test_average_drawdown_is_none_when_the_path_never_leaves_a_peak():
    assert average_drawdown(on(["2020-01-01", "2020-01-02"], [0, 0])) is None


def test_ulcer_index_is_the_root_mean_square_of_the_whole_path():
    assert ulcer_index(PATH) == close(0.30618621784789724)


def test_ulcer_index_of_a_path_that_stays_at_the_peak_is_zero():
    assert ulcer_index(on(["2020-01-01", "2020-01-02"], [0, 0])) == close(0)


def test_ulcer_index_is_none_when_the_path_is_empty():
    assert ulcer_index(on([], [])) is None


def test_episodes_run_from_the_peak_through_recovery_deepest_first():
    """Length counts observations after the peak and before the recovery date.

    Recovery counts observations after the trough up to and including the end.
    An unfinished run has no end and no recovery. Equal depths keep the earlier start first.
    """
    found = episodes(PATH)
    assert len(found) == 2
    assert found[0] == DrawdownEpisode(
        start="2020-01-02",
        trough="2020-01-03",
        end="2020-01-05",
        depth=-0.5,
        length=2,
        recovery=2,
    )
    assert found[1] == DrawdownEpisode(
        start="2020-01-05",
        trough="2020-01-06",
        end=None,
        depth=-0.5,
        length=1,
        recovery=None,
    )


def test_calmar_divides_annualized_return_by_the_depth_magnitude():
    assert calmar(0.08, -0.02) == close(4)


def test_calmar_is_none_when_the_depth_is_zero():
    assert calmar(0.08, 0) is None
