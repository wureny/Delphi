# Thread 02 Aura Queries

这份文档收 thread2 在 Aura 控制台里最常用的查询，目的是让 ontology / context graph 的结构检查、回归检查和演示都可重复。

## 1. Schema Root

```cypher
MATCH (n:ResearchGraphSchema)
RETURN n;
```

## 2. Ontology Type Registry

```cypher
MATCH (n:OntologyNodeType)
RETURN n
ORDER BY n.name;
```

## 3. Runtime Type Registry

```cypher
MATCH (n:RuntimeNodeType)
RETURN n
ORDER BY n.name;
```

## 4. Stable Merge Policies

```cypher
MATCH (n:StableMergePolicy)
RETURN n
ORDER BY n.nodeType;
```

## 5. Stable Relationship Registry

```cypher
MATCH (a:OntologyNodeType)-[r:ALLOWS_STABLE_RELATION]->(b:OntologyNodeType)
RETURN a, r, b
ORDER BY a.name, r.type, b.name;
```

## 6. Runtime Relationship Registry

```cypher
MATCH (a)-[r:ALLOWS_RUNTIME_RELATION]->(b)
RETURN a, r, b
ORDER BY a.name, r.type, b.name;
```

## 7. All Registry Structure

```cypher
MATCH (a)-[r]->(b)
WHERE a:ResearchGraphSchema
   OR a:OntologyNodeType
   OR a:RuntimeNodeType
   OR a:StableMergePolicy
RETURN a, r, b
LIMIT 200;
```

## 8. Smoke Write Verification

如果运行过 `npm run neo4j:smoke-write` 且脚本尚未清理，可用：

```cypher
MATCH (c:InvestmentCase)-[:FOCUSES_ON]->(a:Asset)
MATCH (c)-[:HAS_THESIS]->(t:Thesis)
RETURN c.caseId, a.ticker, t.thesisId
ORDER BY c.caseId DESC
LIMIT 20;
```

## 9. Constraints Check

```cypher
SHOW CONSTRAINTS
YIELD name, type, entityType, labelsOrTypes, properties
RETURN name, type, entityType, labelsOrTypes, properties
ORDER BY name;
```

## 10. Notes

- thread2 当前在 Aura 里初始化的是 registry / contract 结构，不是完整业务数据。
- 真实 case 数据需要后续 runtime 或 seed 脚本持续写入。
- `neo4j-driver` 查询结果里的整数现在已经在代码层自动转成普通 JS number，不再显示 `low/high` 结构。
