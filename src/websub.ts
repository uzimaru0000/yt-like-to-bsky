import { object, string, parseAsync } from 'valibot'
import { XMLParser } from "fast-xml-parser";

const X_HUB_SIGNATURE = /sha1=([0-9a-f]{40})/;

const rss = object({
  rss: object({
    channel: object({
      item: object({
        title: string(),
        link: string(),
      })
    }),
  }),
});

export const parser = async (body: string) => {
	const xmlParser = new XMLParser();
  const xml = xmlParser.parse(body)
  const data = await parseAsync(rss, xml)

  return data;
}

export const validate = async (sign: string, body: string, secret: string) => {
  const match = sign.match(X_HUB_SIGNATURE);
  if (!match) {
    return false;
  }

  const signature = match[1];
  return await validateHmac(signature, body, secret);
};

const validateHmac = async (
  hubSignature: string,
  msg: string,
  secret: string
) => {
  const keyBytes = new TextEncoder().encode(secret);
  const msgBytes = new TextEncoder().encode(msg);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-1" },
    true,
    ["sign", "verify"]
  );

  const signature = await crypto.subtle
    .sign("HMAC", key, msgBytes)
    .then((x) => {
      const arr = new Uint8Array(x);
      return Array.from(arr, (x) => x.toString(16).padStart(2, "0")).join("");
    });

  return signature === hubSignature;
};


