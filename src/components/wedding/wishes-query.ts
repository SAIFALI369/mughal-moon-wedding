import { queryOptions } from "@tanstack/react-query";
import { getWishes } from "./wishes.functions";

export const wishesQuery = queryOptions({
  queryKey: ["wedding-wishes"],
  queryFn: () => getWishes(),
});
