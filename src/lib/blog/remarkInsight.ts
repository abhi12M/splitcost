type MarkdownNode = {
  type?: string;
  name?: string;
  data?: {
    hName?: string;
    hProperties?: Record<string, unknown>;
  };
  children?: MarkdownNode[];
};

function decorateInsightNodes(node: MarkdownNode) {
  if (node.type === "containerDirective" && node.name === "insight") {
    node.data = {
      ...node.data,
      hName: "aside",
      hProperties: {
        ...node.data?.hProperties,
        className: ["blog-insight"],
      },
    };
  }

  node.children?.forEach(decorateInsightNodes);
}

export function remarkInsight() {
  return (tree: MarkdownNode) => decorateInsightNodes(tree);
}
