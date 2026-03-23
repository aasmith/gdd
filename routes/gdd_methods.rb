module Routes
  module GddMethods
    def self.registered(app)
      app.get "/api/gdd_methods" do
        json DB[:gdd_methods].all
      end

      app.post "/api/gdd_methods" do
        data = JSON.parse(request.body.read)
        id = DB[:gdd_methods].insert(
          name: data["name"],
          base_f: data["base_f"],
          cap_f: data["cap_f"]
        )
        json DB[:gdd_methods][id: id]
      end

      app.put "/api/gdd_methods/:id" do
        data = JSON.parse(request.body.read)
        DB[:gdd_methods].where(id: params[:id]).update(
          name: data["name"],
          base_f: data["base_f"],
          cap_f: data["cap_f"]
        )
        json DB[:gdd_methods][id: params[:id].to_i]
      end

      app.delete "/api/gdd_methods/:id" do
        DB[:gdd_methods].where(id: params[:id]).delete
        json({ deleted: true })
      end
    end
  end
end
