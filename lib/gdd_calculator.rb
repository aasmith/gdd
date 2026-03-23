module GddCalculator
  # Single day GDD given a method's base and cap
  def self.daily(temp_min, temp_max, base, cap)
    t_min = [temp_min, base].max
    t_max = [temp_max, cap].min
    t_max = [t_max, base].max
    [(t_max + t_min) / 2.0 - base, 0].max
  end

  # Given an array of {date:, temp_min:, temp_max:} and base/cap,
  # return array of {date:, gdd:, cumulative:}
  def self.cumulative(daily_temps, base, cap)
    total = 0.0
    daily_temps.map do |row|
      gdd = daily(row[:temp_min], row[:temp_max], base, cap)
      total += gdd
      { date: row[:date].to_s, gdd: gdd.round(1), cumulative: total.round(1) }
    end
  end

  # Average temp_min and temp_max for each day-of-year across multiple years
  # Returns hash: { day_of_year => { temp_min:, temp_max: } }
  def self.historical_averages(all_temps)
    by_doy = Hash.new { |h, k| h[k] = { mins: [], maxs: [] } }
    all_temps.each do |row|
      doy = Date.parse(row[:date].to_s).yday
      by_doy[doy][:mins] << row[:temp_min]
      by_doy[doy][:maxs] << row[:temp_max]
    end
    by_doy.transform_values do |v|
      { temp_min: v[:mins].sum / v[:mins].size,
        temp_max: v[:maxs].sum / v[:maxs].size }
    end
  end

  # Build a full season curve: actual temps for past, projected for future.
  # Returns array of {date:, gdd:, cumulative:, projected:}
  def self.season_curve(db, method_id, year, season_start_md, season_end_md)
    method = db[:gdd_methods][id: method_id]
    base = method[:base_f]
    cap = method[:cap_f]

    start_date = Date.parse("#{year}-#{season_start_md}")
    end_date = Date.parse("#{year}-#{season_end_md}")
    today = Date.today

    # Get all historical temps for averaging
    all_temps = db[:daily_temps].where { date < start_date }.all
    averages = historical_averages(all_temps)

    # Get actual temps for this season
    actuals = db[:daily_temps]
      .where(date: start_date..end_date)
      .order(:date)
      .all
      .each_with_object({}) { |r, h| h[r[:date].to_s] = r }

    # Build combined curve
    total = 0.0
    (start_date..end_date).map do |date|
      ds = date.to_s
      projected = date > today

      if actuals[ds]
        temp_min = actuals[ds][:temp_min]
        temp_max = actuals[ds][:temp_max]
      else
        avg = averages[date.yday] || { temp_min: base, temp_max: base }
        temp_min = avg[:temp_min]
        temp_max = avg[:temp_max]
        projected = true
      end

      gdd = daily(temp_min, temp_max, base, cap)
      total += gdd

      { date: ds, gdd: gdd.round(1), cumulative: total.round(1), projected: projected }
    end
  end

  # Find the date when cumulative GDD from start_date reaches target_gdd
  def self.project_date(curve, start_date, target_gdd)
    start_ds = start_date.to_s
    start_idx = curve.index { |r| r[:date] >= start_ds }
    return nil unless start_idx

    base_cumulative = start_idx > 0 ? curve[start_idx - 1][:cumulative] : 0
    needed = base_cumulative + target_gdd

    entry = curve[start_idx..].find { |r| r[:cumulative] >= needed }
    entry&.fetch(:date)
  end
end
