module Routes
  module Sheets
    def self.registered(app)
      app.get "/api/sheets" do
        json DB[:sheets].order(:year, :name).all
      end

      app.post "/api/sheets" do
        data = JSON.parse(request.body.read)
        id = DB[:sheets].insert(
          name: data["name"],
          year: data["year"]
        )
        json DB[:sheets][id: id]
      end

      app.put "/api/sheets/:id" do
        data = JSON.parse(request.body.read)
        updates = {}
        %w[name year].each { |f| updates[f.to_sym] = data[f] if data.key?(f) }
        DB[:sheets].where(id: params[:id]).update(updates)
        json DB[:sheets][id: params[:id].to_i]
      end

      app.delete "/api/sheets/:id" do
        DB[:plantings].where(sheet_id: params[:id]).delete
        DB[:sheets].where(id: params[:id]).delete
        json({ deleted: true })
      end
    end
  end
end
