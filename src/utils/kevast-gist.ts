import { MutationEvent, Storage } from "kevast/dist/Storage"

interface KVMap {
  [key: string]: string | undefined
}

const DEFAULT_FILENAME = "kevast-gist-default.json"

export class KevastGist implements Storage {
  private gistId: string
  private filename: string
  private cache: KVMap
  private initialized: boolean
  private token: string

  public constructor(token: string, gistId?: string, filename?: string) {
    if (typeof token !== "string") {
      throw TypeError("Access token must be string.")
    }
    if (gistId !== undefined && typeof gistId !== "string") {
      throw TypeError("Gist id must be string.")
    }
    if (filename !== undefined && typeof filename !== "string") {
      throw TypeError("Filename must be string.")
    }
    this.token = token
    this.cache = {}
    this.initialized = false
    this.gistId = gistId || ""
    this.filename = filename || ""
  }
  public async get(key: string): Promise<string | undefined> {
    await this.init()
    return this.cache[key]
  }
  public async mutate(event: MutationEvent) {
    await this.init()
    event.set.forEach((pair) => (this.cache[pair.key] = pair.value))
    event.removed.forEach((key) => delete this.cache[key])
    if (event.clear) {
      this.cache = {}
    }
    await this.write()
  }
  public async getGistId(): Promise<string> {
    if (!this.gistId) {
      await this.init()
    }
    return this.gistId
  }
  public async getFilename(): Promise<string> {
    if (!this.filename) {
      await this.init()
    }
    return this.filename
  }
  public async init(): Promise<void> {
    if (this.initialized) {
      return
    }
    try {
      await this.update(true)
      this.initialized = true
    } catch (err) {
      handleError(err)
    }
  }

  public async update(force: boolean = false): Promise<void> {
    if(!force && !this.initialized) {
      await this.init()
    }
    if (this.gistId && this.filename) {
      this.cache = await this.read()
    }
    if (!this.gistId) {
      this.filename = DEFAULT_FILENAME
      this.gistId = this.gistId = await this.createGist()
      this.cache = {}
    }
    if (!this.filename) {
      this.filename = DEFAULT_FILENAME
      await this.createFile()
      this.cache = {}
    }
  }
  private async write(): Promise<void> {
    const payload = {
      files: {
        [this.filename]: {
          content: JSON.stringify(this.cache),
        },
      },
    }
    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Failed to write gist: ${response.status}`)
    }
  }
  private async read(): Promise<KVMap> {
    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      headers: {
        Authorization: `token ${this.token}`,
        "Cache-Control": "no-cache, no-store",
      },
    })
    if (!response.ok) {
      throw new Error(`Failed to read gist: ${response.status}`)
    }
    const data = await response.json()
    const file = data.files[this.filename]
    if (!file) {
      // Create a new one owns the filename
      await this.createFile()
      return {}
    } else if (file.size === 0) {
      return {}
    } else {
      let content: string
      if (file.truncated) {
        const rawResponse = await fetch(file.raw_url)
        if (!rawResponse.ok) {
          throw new Error(`Failed to fetch raw content: ${rawResponse.status}`)
        }
        content = await rawResponse.text()
      } else {
        content = file.content
      }
      try {
        return JSON.parse(content)
      } catch (err) {
        throw new Error("Fail to parse gist content")
      }
    }
  }
  private async createFile(): Promise<void> {
    const payload = {
      files: {
        [this.filename]: {
          content: "{}",
        },
      },
    }
    const response = await fetch(`https://api.github.com/gists/${this.gistId}`, {
      method: "PATCH",
      headers: {
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Failed to create file: ${response.status}`)
    }
  }
  private async createGist(): Promise<string> {
    const payload = {
      description: "This file is used by KevastGist.",
      public: false,
      files: {
        [this.filename]: {
          content: "{}",
        },
      },
    }
    const response = await fetch("https://api.github.com/gists", {
      method: "POST",
      headers: {
        Authorization: `token ${this.token}`,
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store",
      },
      body: JSON.stringify(payload),
    })
    if (!response.ok) {
      throw new Error(`Failed to create gist: ${response.status}`)
    }
    const data = await response.json()
    return data.id
  }
}

function handleError(error: any) {
  if (error.response) {
    const response = error.response
    if (response.status === 401) {
      throw new Error("Invalid access token")
    } else if (response.status === 404) {
      const scopes = response.headers.get("x-oauth-scopes") as string
      if (!scopes || !scopes.includes("gist")) {
        throw new Error('The OAuth scopes of access token must include "gist"')
      } else if (response.data && response.data.message === "Not Found") {
        throw new Error(
          "Gist does not exist or No permission to operate this gist"
        )
      }
    }
  }
  throw error
}
