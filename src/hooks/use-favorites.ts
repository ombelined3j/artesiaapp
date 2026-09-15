import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { fetchFavoriteIds, toggleFavorite } from "@/lib/artesia";

export function useFavorites() {
  const queryClient = useQueryClient();
  const { data: favoriteIds = [] } = useQuery({
    queryKey: ["favorites", "ids"],
    queryFn: fetchFavoriteIds,
  });

  const mutation = useMutation({
    mutationFn: ({ id, isFavorite }: { id: string; isFavorite: boolean }) =>
      toggleFavorite(id, isFavorite),
    onSuccess: (added) => {
      queryClient.invalidateQueries({ queryKey: ["favorites"] });
      toast.success(added ? "Ajouté à vos favoris" : "Retiré de vos favoris");
    },
    onError: () => toast.error("Impossible de mettre à jour ce favori"),
  });

  return {
    favoriteIds,
    isFavorite: (id: string) => favoriteIds.includes(id),
    toggle: (id: string) => mutation.mutate({ id, isFavorite: favoriteIds.includes(id) }),
  };
}
