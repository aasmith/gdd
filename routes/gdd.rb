require_relative "../lib/gdd_calculator"

module Routes
  module Gdd
    def self.registered(app)
      # Daily GDD values for a date range
      app.get "/api/gdd" do
        method = DB[:gdd_methods][id: params[:method_id]]
        halt 400, { error: "method_id required" }.to_json unless method

        from = params[:from] || "#{Date.today.year}-03-01"
        to = params[:to] || Date.today.to_s

        temps = DB[:daily_temps]
          .where(date: Date.parse(from)..Date.parse(to))
          .order(:date)
          .all

        json GddCalculator.cumulative(temps, method[:base_f], method[:cap_f])
      end

      # Full season curve: actual + projected, for a given method and year
      app.get "/api/gdd/cumulative" do
        method_id = params[:method_id]&.to_i
        halt 400, { error: "method_id required" }.to_json unless method_id

        settings = DB[:settings].first
        year = (params[:year] || Date.today.year).to_i

        json GddCalculator.season_curve(
          DB, method_id, year,
          settings[:season_start], settings[:season_end]
        )
      end

      # Project: given a start date and GDD target, when will it be reached?
      app.get "/api/gdd/projection" do
        method_id = params[:method_id]&.to_i
        halt 400, { error: "method_id required" }.to_json unless method_id

        from = params[:from]
        gdd_target = params[:gdd]&.to_f
        halt 400, { error: "from and gdd required" }.to_json unless from && gdd_target

        settings = DB[:settings].first
        year = Date.parse(from).year

        curve = GddCalculator.season_curve(
          DB, method_id, year,
          settings[:season_start], settings[:season_end]
        )

        projected_date = GddCalculator.project_date(curve, Date.parse(from), gdd_target)

        json({
          from: from,
          gdd_target: gdd_target,
          projected_date: projected_date,
          will_finish: !projected_date.nil?
        })
      end
    end
  end
end
