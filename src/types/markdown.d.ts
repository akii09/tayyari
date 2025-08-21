declare module 'markdown-it-katex' {
  import MarkdownIt from 'markdown-it';
  
  interface KatexOptions {
    throwOnError?: boolean;
    errorColor?: string;
    [key: string]: any;
  }
  
  function katex(md: MarkdownIt, options?: KatexOptions): void;
  export = katex;
}

declare module 'markdown-it-link-attributes' {
  import MarkdownIt from 'markdown-it';
  
  interface LinkAttributesOptions {
    pattern?: RegExp;
    attrs?: {
      [key: string]: string;
    };
    [key: string]: any;
  }
  
  function linkAttributes(md: MarkdownIt, options?: LinkAttributesOptions): void;
  export = linkAttributes;
}

declare module 'highlight.js/lib/common' {
  export * from 'highlight.js';
}
