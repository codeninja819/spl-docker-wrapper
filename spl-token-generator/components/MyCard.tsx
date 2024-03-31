import { Card, CardBody, CardHeader } from "@nextui-org/card";

interface MyCardProps {
  name: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}
export function MyCard({ name, children, fullWidth }: MyCardProps) {
  return (
    <>
      <Card
        style={{
          width: fullWidth ? "95%" : "40%",
          marginLeft: "auto",
          marginRight: "auto",
          marginTop: "2rem",
        }}
      >
        <CardHeader
          title="Sol Distributor"
          className="flex-col items-start gap-2"
        >
          <h2 className="text-2xl font-semibold leading-none tracking-tight">
            {name}
          </h2>
        </CardHeader>
        <CardBody>{children}</CardBody>
      </Card>
    </>
  );
}
