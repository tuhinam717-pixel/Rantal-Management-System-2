import type { Metadata } from "next";
import { FileText, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CardGrid, EmptyState } from "@/components/ui/data-table";
import { PageHeader } from "@/components/ui/page-header";
import { DeleteButton } from "@/components/admin/delete-button";
import { NewTemplateDialog } from "@/components/admin/template-form";
import { deleteTemplateAction } from "../actions";
import { requireRole } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Quotation templates" };

export default async function QuotationTemplatesPage() {
  await requireRole("ADMIN");

  const templates = await prisma.quotationTemplate.findMany({
    orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quotation templates"
        description="Header, footer and terms reused on every quotation you send, so creating one is faster."
        back={{ href: "/admin/quotations", label: "Quotations" }}
        actions={<NewTemplateDialog />}
      />

      {templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create one so quotations always carry your header, footer and terms."
          action={<NewTemplateDialog />}
        />
      ) : (
        <CardGrid>
          {templates.map((template) => (
            <Card key={template.id} className="flex flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-ink-900">
                    {template.name}
                  </span>
                  {template.isDefault && (
                    <Badge tone="brand">
                      <Star className="size-3" aria-hidden />
                      Default
                    </Badge>
                  )}
                </div>

                <form action={deleteTemplateAction}>
                  <input type="hidden" name="id" value={template.id} />
                  <DeleteButton
                    label=""
                    confirmMessage={`Delete template "${template.name}"?`}
                  />
                </form>
              </div>

              <dl className="mt-4 space-y-3 border-t border-line pt-3 text-sm">
                {[
                  ["Header", template.header],
                  ["Footer", template.footer],
                  ["Terms", template.terms],
                ]
                  .filter(([, value]) => Boolean(value))
                  .map(([label, value]) => (
                    <div key={label as string}>
                      <dt className="text-xs font-medium uppercase tracking-wide text-ink-500">
                        {label}
                      </dt>
                      <dd className="mt-0.5 line-clamp-3 whitespace-pre-line text-ink-700">
                        {value}
                      </dd>
                    </div>
                  ))}
              </dl>
            </Card>
          ))}
        </CardGrid>
      )}
    </div>
  );
}
