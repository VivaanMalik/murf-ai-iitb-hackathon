declare module "mermaid" {
  export interface MermaidConfig {
    startOnLoad?: boolean;
    theme?: string;
    [key: string]: any;
  }

  export interface Mermaid {
    initialize: (config: MermaidConfig) => void;
    parse: (code: string) => unknown;
    render: (
      id: string,
      code: string,
      cb: (svgCode: string) => void,
      container?: HTMLElement
    ) => void;
  }

  const mermaid: Mermaid;
  export default mermaid;
}
