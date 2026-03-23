require "minitest/autorun"
require_relative "../lib/gdd_calculator"

class GddCalculatorDailyTest < Minitest::Test
  # All above base, all below cap — equals simple average
  def test_entirely_above_base_below_cap
    assert_in_delta 20.0, GddCalculator.daily(60, 80, 50, 86), 0.1
  end

  # Tmax below base — no accumulation
  def test_max_below_base
    assert_equal 0.0, GddCalculator.daily(30, 45, 50, 86)
  end

  # Tmin above cap — full cap-base all day
  def test_min_above_cap
    assert_in_delta 36.0, GddCalculator.daily(90, 100, 50, 86), 0.1
  end

  # Sine crosses base — partial day, less than simple average
  def test_crosses_base
    gdd = GddCalculator.daily(40, 70, 50, 86)
    assert_in_delta 7.54, gdd, 0.1
    # Should be less than simple avg method: (max(40,50)+min(70,86))/2 - 50 = 10
    assert gdd < 10.0
  end

  # Sine crosses cap — horizontal cutoff
  def test_crosses_cap
    assert_in_delta 30.11, GddCalculator.daily(70, 95, 50, 86), 0.1
  end

  # Sine crosses both base and cap
  def test_crosses_both
    assert_in_delta 17.7, GddCalculator.daily(45, 90, 50, 86), 0.1
  end

  # Flat day (min == max)
  def test_flat_day_above_base
    assert_in_delta 15.0, GddCalculator.daily(65, 65, 50, 86), 0.1
  end

  def test_flat_day_below_base
    assert_equal 0.0, GddCalculator.daily(40, 40, 50, 86)
  end

  # Never negative
  def test_never_negative
    assert_equal 0.0, GddCalculator.daily(10, 20, 50, 86)
  end

  # Different base/cap combos (OSU methods)
  def test_brassica_method
    # Base 32, cap 70 — low thresholds, accumulates more
    gdd = GddCalculator.daily(40, 60, 32, 70)
    assert_in_delta 18.0, gdd, 0.1
  end

  def test_pepper_method
    # Base 52, cap 100 — high base, accumulates less on cool days
    gdd = GddCalculator.daily(48, 72, 52, 100)
    assert gdd < 10.0
    assert gdd > 0.0
  end
end

class GddCalculatorCumulativeTest < Minitest::Test
  def test_cumulative_sums_correctly
    temps = [
      { date: "2026-06-01", temp_min: 60.0, temp_max: 80.0 },
      { date: "2026-06-02", temp_min: 62.0, temp_max: 82.0 },
      { date: "2026-06-03", temp_min: 55.0, temp_max: 75.0 },
    ]
    result = GddCalculator.cumulative(temps, 50.0, 86.0)

    assert_equal 3, result.length
    assert_equal "2026-06-01", result[0][:date]

    # Each day's cumulative should be running total
    assert_in_delta result[0][:gdd], result[0][:cumulative], 0.01
    assert_in_delta result[0][:gdd] + result[1][:gdd], result[1][:cumulative], 0.01
    assert_in_delta result[0][:gdd] + result[1][:gdd] + result[2][:gdd], result[2][:cumulative], 0.01
  end
end

class GddCalculatorHistoricalAveragesTest < Minitest::Test
  def test_averages_by_day_of_year
    # Use Jan 15 — same day-of-year (15) regardless of leap year
    temps = [
      { date: "2024-01-15", temp_min: 50.0, temp_max: 70.0 },
      { date: "2025-01-15", temp_min: 54.0, temp_max: 74.0 },
    ]
    avgs = GddCalculator.historical_averages(temps)
    doy = Date.parse("2025-01-15").yday

    assert_in_delta 52.0, avgs[doy][:temp_min], 0.01
    assert_in_delta 72.0, avgs[doy][:temp_max], 0.01
  end
end
