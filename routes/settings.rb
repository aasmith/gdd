module Routes
  module Settings
    def self.registered(app)
      app.get "/api/settings" do
        json DB[:settings].first
      end

      app.put "/api/settings" do
        data = JSON.parse(request.body.read)
        updates = {}
        %w[season_start season_end week_line_day].each do |f|
          updates[f.to_sym] = data[f] if data.key?(f)
        end
        DB[:settings].where(id: 1).update(updates)
        json DB[:settings].first
      end
    end
  end
end
