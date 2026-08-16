type MarkdownNode = {
  type?: string;
  name?: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  children?: MarkdownNode[];
};

function decorateQuoteNodes(node: MarkdownNode) {
  if (node.type === "containerDirective" && node.name === "quote") {
    node.data = {
      ...node.data,
      hName: "blockquote",
      hProperties: {
        ...node.data?.hProperties,
        className: ["blog-quote"],
      },
    };
  }

  node.children?.forEach(decorateQuoteNodes);
}

export function remarkQuote() {
  return (tree: MarkdownNode) => decorateQuoteNodes(tree);
}
