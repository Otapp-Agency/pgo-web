import {
    defaultShouldDehydrateQuery,
    QueryClient,
} from '@tanstack/react-query';

export function makeQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                // Set data to stay "fresh" for 30s so window focus doesn't trigger 
                // unnecessary double-fetches between intervals
                staleTime: 10 * 1000,

                // Actual 30 second interval
                refetchInterval: 10 * 1000,
                refetchOnWindowFocus: true,
                refetchOnMount: true,
            },
            dehydrate: {
                // serializeData: superjson.serialize,
                shouldDehydrateQuery: (query) =>
                    defaultShouldDehydrateQuery(query) ||
                    query.state.status === 'pending',
            },
            hydrate: {
                // deserializeData: superjson.deserialize,
            },
        },
    });
}