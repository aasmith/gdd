module Routes
  module EventLog
    def self.registered(app)
      app.get "/api/events" do
        ds = DB[:event_log]
          .left_join(:sheets, id: :sheet_id)
          .select(
            Sequel[:event_log][:id],
            Sequel[:event_log][:planting_id],
            Sequel[:event_log][:sheet_id],
            Sequel[:event_log][:action],
            Sequel[:event_log][:details],
            Sequel[:event_log][:created_at],
            Sequel[:sheets][:name].as(:sheet_name),
            Sequel[:sheets][:year].as(:sheet_year)
          )
          .order(Sequel.desc(Sequel[:event_log][:created_at]))

        if params[:sheet_id]
          ds = ds.where(Sequel[:event_log][:sheet_id] => params[:sheet_id].to_i)
        elsif params[:year]
          ds = ds.where(Sequel[:sheets][:year] => params[:year].to_i)
        end

        ds = ds.limit(params[:limit]&.to_i || 200)

        json ds.all
      end
    end
  end
end
