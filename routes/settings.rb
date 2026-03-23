module Routes
  module Settings
    def self.registered(app)
      app.get "/api/settings" do
        json DB[:settings].first
      end

      app.put "/api/settings" do
        data = JSON.parse(request.body.read)
        DB[:settings].where(id: 1).update(
          season_start: data["season_start"],
          season_end: data["season_end"]
        )
        json DB[:settings].first
      end
    end
  end
end
