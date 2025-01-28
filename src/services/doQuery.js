import { Parser } from "n3";
import rdf from "rdf-ext";

export async function executeQuery(query) {
  const headers = new Headers({
    Accept: "text/turtle",
    "Content-Type": "application/x-www-form-urlencoded",
  });

  const response = await fetch("/sparql", {
    method: "POST",
    headers: headers,
    body: new URLSearchParams({ query }).toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text);
  }

  const responseData = await response.text();
  const parser = new Parser({ format: "text/turtle" });
  return rdf.dataset([...parser.parse(responseData)]);
}
