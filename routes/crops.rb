module Routes
  module Crops
    def self.registered(app)
      app.get "/api/crops" do
        rows = DB[:crops]
          .left_join(:gdd_methods, id: :gdd_method_id)
          .select(
            Sequel[:crops][:id],
            Sequel[:crops][:name],
            Sequel[:crops][:variety],
            Sequel[:crops][:gdd],
            Sequel[:crops][:gdd_method_id],
            Sequel[:gdd_methods][:name].as(:gdd_method_name),
            Sequel[:gdd_methods][:base_f],
            Sequel[:gdd_methods][:cap_f]
          ).all
        json rows
      end

      app.post "/api/crops" do
        data = JSON.parse(request.body.read)
        id = DB[:crops].insert(
          name: data["name"],
          variety: data["variety"],
          gdd: data["gdd"],
          gdd_method_id: data["gdd_method_id"]
        )
        json DB[:crops][id: id]
      end

      app.put "/api/crops/:id" do
        data = JSON.parse(request.body.read)
        DB[:crops].where(id: params[:id]).update(
          name: data["name"],
          variety: data["variety"],
          gdd: data["gdd"],
          gdd_method_id: data["gdd_method_id"]
        )
        json DB[:crops][id: params[:id].to_i]
      end

      app.delete "/api/crops/:id" do
        DB[:crops].where(id: params[:id]).delete
        json({ deleted: true })
      end
    end
  end
end
