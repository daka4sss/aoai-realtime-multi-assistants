import axios from 'axios';
let bing_key = import.meta.env.VITE_BING_API_KEY;
export async function bingWebSearch(query: string): Promise<string> {
    let client = axios.create({
        baseURL: 'https://api.bing.microsoft.com',
        headers: { 'Ocp-Apim-Subscription-Key':  bing_key }
    });
    let queryResult = await client.get(`/v7.0/search?q=${encodeURIComponent(query)}`);
    let result = "search results: ";
    let pages: [] = queryResult.data["webPages"].value;
    pages.forEach(x=>result +=` title:${x["name"]}, snippet: ${x["snippet"]}`);
    console.log(result);
    return result;
}       